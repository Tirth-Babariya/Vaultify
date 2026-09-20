/**
 * Crypto utilities (Web Crypto API).
 *
 * Vault encryption model
 * ----------------------
 * - A random 256-bit data key (DEK) encrypts the vault (AES-GCM).
 * - The master password never encrypts data directly. It goes through
 *   PBKDF2 (600k iterations) and is split with HKDF into two independent
 *   values: a key-encryption key (KEK, wraps the DEK, never leaves the
 *   browser) and an auth secret (sent to the server as the account password,
 *   so the server never sees anything that can unlock the vault).
 * - A recovery key wraps the same DEK, so a forgotten master password can be
 *   recovered without the server ever holding a usable secret.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const PBKDF2_ITERATIONS = 600000;

// ---- encoding helpers ------------------------------------------------------

export const toB64 = (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

export const fromB64 = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

const concat = (a, b) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
};

export const randomB64 = (bytes = 16) => toB64(crypto.getRandomValues(new Uint8Array(bytes)));

// ---- legacy (v1) helpers, kept only to migrate existing local vaults -------

export const hashPassword = async (password) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return toHex(hashBuffer);
};

const legacyKey = async (password, salt) => {
  const passwordKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
};

export const decryptLegacy = async (encryptedBase64, password) => {
  const bytes = fromB64(encryptedBase64);
  const key = await legacyKey(password, bytes.slice(0, 16));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28) }, key, bytes.slice(28));
  return JSON.parse(dec.decode(plain));
};

// ---- key derivation --------------------------------------------------------

export const cloudSalt = (email) => `vaultify:v1:${email.trim().toLowerCase()}`;

export async function deriveMasterKeys(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const master = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    256
  );
  const hkdf = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const hkdfParams = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) });

  const kek = await crypto.subtle.deriveKey(hkdfParams('vaultify/kek'), hkdf, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
  const authBits = await crypto.subtle.deriveBits(hkdfParams('vaultify/auth'), hkdf, 256);
  return { kek, authSecret: toHex(authBits) };
}

// ---- data key (DEK) --------------------------------------------------------

// Extractable on purpose: it has to be re-wrapped when the password changes and
// kept (as raw bytes) in sessionStorage so a page reload doesn't force a re-unlock.
export const generateDek = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

export const exportDek = async (dek) => toB64(await crypto.subtle.exportKey('raw', dek));

export const importDek = (b64) =>
  crypto.subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

export async function wrapDek(dek, kek) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv });
  return 'w1:' + toB64(concat(iv, new Uint8Array(wrapped)));
}

// Throws if `kek` is wrong (AES-GCM authentication failure).
export async function unwrapDek(wrapped, kek) {
  const bytes = fromB64(wrapped.replace(/^w1:/, ''));
  return crypto.subtle.unwrapKey(
    'raw',
    bytes.slice(12),
    kek,
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ---- vault payload ---------------------------------------------------------

export async function encryptJson(data, dek) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc.encode(JSON.stringify(data)));
  return 'v2:' + toB64(concat(iv, new Uint8Array(cipher)));
}

export async function decryptJson(payload, dek) {
  const bytes = fromB64(payload.replace(/^v2:/, ''));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, dek, bytes.slice(12));
  return JSON.parse(dec.decode(plain));
}

// ---- recovery key ----------------------------------------------------------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateRecoveryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(20)); // 160 bits
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{1,4}/g).join('-');
}

export const normalizeRecoveryKey = (key) => key.toUpperCase().replace(/[^A-Z2-7]/g, '');

export async function deriveRecoveryKek(recoveryKey) {
  const hkdf = await crypto.subtle.importKey('raw', enc.encode(normalizeRecoveryKey(recoveryKey)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('vaultify/recovery-kek') },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}
