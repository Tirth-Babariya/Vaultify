import Link from 'next/link';
import Logo from '@/components/Logo';
import GitHubLink from '@/components/GitHubLink';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = {
  title: 'How Vaultify works',
  description: 'How Vaultify encrypts, syncs and protects your passwords, and what it can and cannot see.',
};

const TOC = [
  ['overview', 'Overview'],
  ['modes', 'Local vs cloud'],
  ['encryption', 'How encryption works'],
  ['server', 'What the server sees'],
  ['sync', 'Sync & offline'],
  ['recovery', 'Recovery'],
  ['activity', 'Login activity'],
  ['groups', 'Groups & passcodes'],
  ['privacy', 'Privacy notes'],
  ['limits', 'Limitations'],
  ['faq', 'FAQ'],
];

function Section({ id, eyebrow, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">{eyebrow}</p>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {intro && <p className="text-sm opacity-60 leading-relaxed max-w-2xl">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-foreground/[0.02] p-5 space-y-2 ${className}`}>
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      <div className="text-sm opacity-70 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Check({ children, bad = false }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${bad ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
        {bad ? '✕' : '✓'}
      </span>
      <span className="opacity-80 leading-relaxed">{children}</span>
    </li>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="bg-foreground/[0.04] text-left">
            {head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, i) => (
                <td key={i} className={`px-4 py-3 align-top leading-relaxed ${i === 0 ? 'font-medium' : 'opacity-70'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Faq({ q, children }) {
  return (
    <details className="group rounded-2xl border border-border bg-foreground/[0.02] open:bg-foreground/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {q}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0 opacity-50 transition-transform group-open:rotate-180">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <div className="px-5 pb-5 text-sm opacity-70 leading-relaxed space-y-2">{children}</div>
    </details>
  );
}

const STEPS = [
  ['You type your master password', 'It never leaves your browser and is never stored anywhere. Vaultify only holds it for the moment it takes to derive keys from it.'],
  ['It is stretched into two separate keys', 'PBKDF2-SHA256 with 600,000 rounds, then HKDF splits the result into a wrapping key (stays on your device) and a login secret (what the server sees instead of your password). Knowing one tells you nothing about the other.'],
  ['Your random vault key is unlocked', 'Your vault is encrypted with a random 256-bit key created on your device. The wrapping key unlocks it. Changing your master password only re-wraps this key, so your data is never re-encrypted or re-uploaded.'],
  ['Everything is encrypted before it is saved', 'Every entry and group lives inside one AES-256-GCM encrypted blob. Local mode keeps that blob in your browser; cloud mode also uploads the very same blob.'],
  ['Other devices repeat the same steps', 'Sign in anywhere with your email and master password. That device derives the same keys, downloads the encrypted blob and decrypts it locally. The server is only ever a courier for ciphertext.'],
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-[var(--background)]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href="/lock" className="flex items-center gap-2.5">
            <span className="avatar-badge w-8 h-8 !rounded-lg"><Logo size={16} className="text-current" /></span>
            <span className="font-bold tracking-tight">Vaultify</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <GitHubLink />
            <Link href="/lock" className="btn-primary !min-h-9 !px-4 !py-1.5 text-sm">Open Vaultify</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 space-y-1">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest opacity-40">On this page</p>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-sm opacity-60 transition hover:bg-foreground/[0.05] hover:opacity-100">{label}</a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-20">
          {/* Hero */}
          <div id="overview" className="scroll-mt-24 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium opacity-80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Zero-knowledge · end-to-end encrypted
            </span>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              A password manager that can’t read your passwords.
            </h1>
            <p className="max-w-2xl text-base opacity-60 leading-relaxed">
              Vaultify encrypts everything in your browser before it is saved. Keep your vault on this device only, or sync it across every device you own. Either way, the only person who can unlock it is you.
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <Card title="Encrypted in your browser">Passwords are locked with AES-256-GCM before they touch storage or the network.</Card>
              <Card title="Zero-knowledge">Your master password and vault key are never sent to any server, ever.</Card>
              <Card title="Yours to choose">Stay fully local, or turn on cloud sync to sign in from any device.</Card>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {[['AES-256-GCM', 'vault encryption'], ['600,000×', 'PBKDF2 key stretching'], ['160-bit', 'recovery key'], ['0', 'plaintext bytes uploaded']].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-border p-4">
                  <div className="text-xl font-bold tracking-tight">{v}</div>
                  <div className="mt-0.5 text-xs opacity-50">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modes */}
          <Section id="modes" eyebrow="Choose your storage" title="Two ways to keep your vault" intro="You pick when you create your account, and you can switch later from Settings → Account.">
            <Table
              head={['', 'This device only', 'Sync across devices']}
              rows={[
                ['Where your vault lives', 'An encrypted copy in this browser', 'An encrypted copy in this browser and in the cloud (Supabase)'],
                ['Account needed', 'No account, no email', 'Email + master password'],
                ['Use it on other devices', 'No', 'Yes: sign in anywhere and it appears'],
                ['Works offline', 'Always', 'Yes, changes sync when you reconnect'],
                ['If you forget your master password', 'Not recoverable', 'Recover with your recovery key'],
                ['If you clear browser data', 'The vault is gone (export a backup)', 'Sign in again and it comes back'],
                ['Best for', 'Maximum privacy on one machine', 'Everyday use across phone and computer'],
              ]}
            />
          </Section>

          {/* Encryption */}
          <Section id="encryption" eyebrow="Under the hood" title="How your passwords are protected" intro="Five steps, all of them happening on your device.">
            <ol className="relative space-y-4">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white shadow-[0_6px_16px_-6px_var(--accent-glow)]">{i + 1}</span>
                    {i < STEPS.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-4 space-y-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm opacity-60 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="grid items-stretch gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-xl bg-foreground/[0.03] p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-50">Your device</div>
                <ul className="space-y-1.5 text-sm opacity-80">
                  <li>Master password</li>
                  <li>Wrapping key</li>
                  <li>Vault key</li>
                  <li className="font-semibold text-[var(--accent)]">Your passwords in plain text</li>
                </ul>
                <p className="text-[11px] opacity-40">Stay here. Never uploaded.</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-2 text-center text-[11px] opacity-60 md:w-28">
                <span>encrypted blob<br />+ wrapped keys</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5 rotate-90 md:rotate-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="rounded-xl bg-foreground/[0.03] p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-50">Cloud (optional)</div>
                <ul className="space-y-1.5 text-sm opacity-80">
                  <li>Your email</li>
                  <li>Login secret (derived)</li>
                  <li>Encrypted vault blob</li>
                  <li>Wrapped keys</li>
                </ul>
                <p className="text-[11px] opacity-40">Ciphertext only. Useless without your password.</p>
              </div>
            </div>
          </Section>

          {/* Server */}
          <Section id="server" eyebrow="Transparency" title="What the server can and can’t see" intro="This only applies if you turn on cloud sync. In local mode nothing is sent at all.">
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="The server can see">
                <ul className="space-y-2">
                  <Check bad>Your email address</Check>
                  <Check bad>That an account exists, and roughly how large the vault is</Check>
                  <Check bad>When your vault changed, and a version counter</Check>
                  <Check bad>Sign-in events: time, browser and operating system</Check>
                </ul>
              </Card>
              <Card title="The server can never see">
                <ul className="space-y-2">
                  <Check>Your master password</Check>
                  <Check>Your vault key or recovery key</Check>
                  <Check>Any site name, username or password</Check>
                  <Check>Your groups, passcodes or notes</Check>
                </ul>
              </Card>
            </div>
            <p className="text-sm opacity-60 leading-relaxed">
              Even a full database leak exposes only ciphertext. Each account is locked by Row Level Security, so a signed-in user can only ever read and write their own rows.
            </p>
          </Section>

          {/* Sync */}
          <Section id="sync" eyebrow="Multiple devices" title="Sync, conflicts and offline use">
            <div className="grid gap-3 md:grid-cols-3">
              <Card title="Automatic sync">Changes upload a moment after you make them. Devices check for updates when you return to the tab, reconnect, and once a minute.</Card>
              <Card title="Safe merging">Two devices edit at once? Vaultify merges item by item, keeping the most recent edit, so nothing is overwritten. Deletions are remembered so removed items don’t come back.</Card>
              <Card title="Offline first">No connection? Keep working. Everything is saved locally and uploaded automatically when you’re back online. The badge shows Synced, Syncing or Offline.</Card>
            </div>
          </Section>

          {/* Recovery */}
          <Section id="recovery" eyebrow="If things go wrong" title="Forgot your master password?" intro="Because we never see your password, nobody can reset it for you. That’s the point. Here’s what your options are.">
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Cloud vaults: recovery key">
                <p>When you create a cloud vault you get a one-time 32-character recovery key. Use “Forgot your password?” on the sign-in screen, follow the email link, enter the key and choose a new master password. Your data is restored intact.</p>
                <p>You can generate a fresh key any time from Settings → Security. A new key invalidates the old one.</p>
              </Card>
              <Card title="No key, or local vaults">
                <p>Without a recovery key the encrypted data cannot be opened by anyone, including us. For cloud vaults you can erase the vault and start fresh on the same account. For local vaults you can reset the vault on the unlock screen.</p>
                <p>Tip: export a backup from the Vault page and keep it somewhere safe.</p>
              </Card>
            </div>
          </Section>

          {/* Activity */}
          <Section id="activity" eyebrow="Awareness" title="Know when your vault was opened">
            <div className="grid gap-3 md:grid-cols-3">
              <Card title="Activity feed">Settings → Activity lists sign-ins, unlocks, password changes and recovery events with the device and browser used, and marks the current device.</Card>
              <Card title="Signed-in status">The sidebar always shows who you’re signed in as and whether the vault is Local only, Synced or Offline.</Card>
              <Card title="Sign out everywhere">Lost a device? Sign out of all devices at once from the Activity tab. Other devices lose sync access until they sign in again. Signing out on a device also removes its local copy.</Card>
            </div>
          </Section>

          {/* Groups */}
          <Section id="groups" eyebrow="Organisation" title="Groups & passcodes">
            <Card>
              <p>Sort entries into groups such as Work, Family or Finance, and move any entry between groups at any time. A group can also have its own passcode that hides its entries until you enter it.</p>
              <p>Good to know: a group passcode is a convenience lock in the interface (for example against someone glancing at your screen). All groups share your vault’s single encryption key, so your master password remains what actually protects your data.</p>
            </Card>
          </Section>

          {/* Privacy notes */}
          <Section id="privacy" eyebrow="The small print" title="Privacy notes" intro="A few features touch the network. Here’s exactly how.">
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Screenshot import (OCR)">Text is read from your screenshot entirely inside your browser and the image is never uploaded. The first time you use it, the OCR engine downloads its language data from a public CDN.</Card>
              <Card title="Site icons">To show a site’s logo, Vaultify asks Google’s favicon service for the icon of well-known sites and domains you’ve typed. That request reveals the domain (never your username or password). Entries with unrecognised names show the Vaultify icon instead and make no request.</Card>
              <Card title="Local activity & settings">Theme, accent colour, sounds and the auto-lock timer are stored only in your browser.</Card>
              <Card title="Exports">Exporting from the Vault page produces a plain JSON file of your entries. It isn’t encrypted, so keep it somewhere safe and delete it when you’re done.</Card>
            </div>
          </Section>

          {/* Limits */}
          <Section id="limits" eyebrow="Honest limits" title="What Vaultify can’t protect you from" intro="No password manager is magic. Knowing the boundaries helps you stay safe.">
            <ul className="space-y-3 rounded-2xl border border-border p-5">
              <Check bad>Malware, keyloggers or a compromised browser extension on your device can see what you type and what’s on screen.</Check>
              <Check bad>A weak master password can be guessed if someone gets a copy of your encrypted vault. Use a long passphrase; key stretching slows attackers but can’t stop a bad password.</Check>
              <Check bad>Anyone using your unlocked device can see your vault. Lock it when you step away (auto-lock helps).</Check>
              <Check bad>While unlocked, the vault key is held in memory and in this tab’s session storage so a page refresh doesn’t log you out. It is cleared when you lock or close the tab.</Check>
              <Check bad>If someone gains access to your email account they can’t read your vault, but they could wipe the cloud copy. Keep a local backup.</Check>
              <Check bad>Losing both your master password and your recovery key means your data is unrecoverable.</Check>
            </ul>
          </Section>

          {/* FAQ */}
          <Section id="faq" eyebrow="Questions" title="Frequently asked questions">
            <div className="space-y-3">
              <Faq q="Can the people who run Vaultify see my passwords?">
                <p>No. Your vault is encrypted with a key that only exists on your devices. If you self-host with your own Supabase project, the database only ever holds ciphertext.</p>
              </Faq>
              <Faq q="What happens if the cloud database is breached?">
                <p>An attacker would get encrypted blobs and wrapped keys. Without your master password or recovery key they cannot be decrypted. The strength of your master password is what stands between them and your data, so make it long.</p>
              </Faq>
              <Faq q="Can I switch between local and cloud later?">
                <p>Yes. Settings → Account lets you turn on cloud sync for an existing local vault (your entries are uploaded encrypted), or switch a synced vault back to local-only, with the option to delete the cloud copy.</p>
              </Faq>
              <Faq q="Why do I need to confirm my email?">
                <p>Confirming your email proves the address is yours, which the recovery flow relies on. Check your spam folder if the message doesn’t arrive.</p>
              </Faq>
              <Faq q="Is my master password my account password too?">
                <p>Effectively yes, but the server never receives it. Your device derives a separate login secret from it, and that is what is sent. This is why one password is enough without weakening security.</p>
              </Faq>
              <Faq q="What happens when I sign out of a device?">
                <p>The local copy on that device is removed and the session ends. Your vault stays safe in the cloud and comes back the next time you sign in.</p>
              </Faq>
              <Faq q="How do I delete everything?">
                <p>Local vault: use “Reset vault” on the unlock screen. Cloud vault: Settings → Account → Turn off cloud sync, tick “Also delete the encrypted copy from the cloud”. Export a backup first if you might need it.</p>
              </Faq>
            </div>
          </Section>

          <div className="rounded-3xl border border-border bg-foreground/[0.03] p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Ready to lock things down?</h2>
            <p className="mx-auto max-w-md text-sm opacity-60">Create a vault in under a minute. Choose where it lives, set a strong master password, done.</p>
            <Link href="/lock" className="btn-primary mx-auto !w-fit">Open Vaultify</Link>
          </div>

          <footer className="pb-8 text-center text-xs opacity-40">Built by Tirth Babariya</footer>
        </main>
      </div>
    </div>
  );
}
