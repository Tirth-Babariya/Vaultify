const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const DOMAIN_RE = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
const USERNAME_LABEL_RE = /(mobile\s*number|user\s*name|user\s*id|login\s*id|login|e-?mail|email|username)/i;
const PASSWORD_LABEL_RE = /(password|pass\s*code|pwd|pass)\b/i;

// Strips stray punctuation OCR tends to tack onto the start/end of a token
// (border artifacts, misread quote marks) while keeping @ . _ - which are
// valid inside emails/usernames/passwords.
function cleanToken(token) {
  return token.replace(/^[^\w@]+/, '').replace(/[^\w!#$%^&*()+=,.?@-]+$/, '');
}

function findLabeledValue(lines, labelRe) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(labelRe);
    if (!match) continue;

    // Only treat same-line trailing text as the value when it follows a real
    // "label: value" separator. A comma/space (e.g. "Mobile number, username
    // or email") is just more label wording, not a value — those cases fall
    // through to the next line, which is where UI screenshots put the value.
    const rest = line.slice(match.index + match[0].length);
    const separatorMatch = rest.match(/^\s*[:\-|]\s*(\S+)/);
    if (separatorMatch) {
      const token = cleanToken(separatorMatch[1]);
      if (token) return token;
    }

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      const token = cleanToken(next.split(/\s+/)[0]);
      if (token) return token;
      break;
    }
  }
  return '';
}

// Best-effort parse of raw OCR text into vault fields. Screenshots vary too
// much to guarantee correctness, so the caller always leaves fields editable.
function parseCredentials(text) {
  const lines = text.split(/\r?\n/);

  const emailMatch = text.match(EMAIL_RE);
  const username = emailMatch ? emailMatch[0] : findLabeledValue(lines, USERNAME_LABEL_RE);
  const password = findLabeledValue(lines, PASSWORD_LABEL_RE);

  const emailDomain = username.includes('@') ? username.split('@')[1].toLowerCase() : null;
  const domainMatches = text.match(DOMAIN_RE) || [];
  const siteCandidate = domainMatches.find((d) => {
    const lower = d.toLowerCase();
    return lower !== emailDomain && d !== password && d !== username;
  });
  const site = siteCandidate ? siteCandidate.replace(/^www\./i, '') : '';

  return { site, username, password };
}

// UI screenshots are the worst case for OCR: small font sizes, and (very
// commonly) light text on a dark background, which Tesseract's models
// aren't tuned for. Upscale + grayscale + contrast-stretch, and flip dark
// images to dark-text-on-light before recognition to substantially improve
// hit rate on real screenshots.
async function preprocessImage(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const longSide = Math.max(width, height);
  const TARGET_LONG_SIDE = 1800;
  const scale = Math.min(3, Math.max(1, TARGET_LONG_SIDE / longSide));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const isDark = sum / (data.length / 4) < 128;

  const CONTRAST = 1.6;
  for (let i = 0; i < data.length; i += 4) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (isDark) lum = 255 - lum;
    lum = Math.min(255, Math.max(0, (lum - 128) * CONTRAST + 128));
    data[i] = data[i + 1] = data[i + 2] = lum;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function extractCredentialsFromImage(file, onProgress) {
  const { createWorker, PSM } = await import('tesseract.js');

  const canvas = await preprocessImage(file);

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
    });
    const { data } = await worker.recognize(canvas);
    const result = parseCredentials(data.text || '');
    return { ...result, rawText: data.text || '' };
  } finally {
    await worker.terminate();
  }
}
