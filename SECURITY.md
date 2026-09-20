# Security Policy

Vaultify handles secrets, so security reports are taken seriously.

## Status

Vaultify is **beta software and has not been independently audited**. Please read the
[Known limitations](README.md#known-limitations) before trusting it with critical credentials.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub: go to the repository’s **Security** tab and choose
**Report a vulnerability** (private vulnerability reporting).

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The affected version / commit, browser and OS

You can expect an acknowledgement within a few days. Once a fix is available, the issue
will be disclosed with credit to the reporter (unless you prefer to stay anonymous).

## Scope

In scope:

- Flaws in key derivation, encryption, key wrapping or the recovery flow (`src/lib/crypto.js`, `vaultStore.js`, `cloud.js`)
- Ways for a server, another user, or another origin to read or alter a vault
- Row Level Security policy gaps in `supabase/schema.sql`
- XSS or injection in the app

Out of scope:

- Attacks that require malware, a keylogger or a malicious extension on the user’s own device
- Weak master passwords chosen by users
- Findings in third-party services (Supabase, Google favicons) themselves
- Missing rate limits on Supabase’s built-in email sender

## Never commit secrets

Do not commit `.env*` files or Supabase `service_role` keys. Vaultify only needs the
public URL and publishable (anon) key.
