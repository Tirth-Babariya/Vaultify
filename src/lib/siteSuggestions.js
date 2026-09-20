// Services offered as autocomplete suggestions for the "Website / App" field, each
// mapped to its real domain so a favicon lookup can be attempted confidently.
// Free-text entries with no dot and no match here fall back to the app's own logo
// instead of guessing a domain (see PasswordCard.jsx). Popular names come first
// inside each group, because equal-ranked matches keep this order.
const SERVICES = [
  // --- Developer platforms & hosting ---
  ['GitHub', 'github.com'], ['GitLab', 'gitlab.com'], ['Bitbucket', 'bitbucket.org'], ['Azure DevOps', 'dev.azure.com'],
  ['Vercel', 'vercel.com'], ['Render', 'render.com'], ['Netlify', 'netlify.com'], ['Railway', 'railway.com'],
  ['Fly.io', 'fly.io'], ['Heroku', 'heroku.com'], ['DigitalOcean', 'digitalocean.com'], ['Cloudflare', 'cloudflare.com'],
  ['AWS', 'aws.amazon.com'], ['Google Cloud', 'cloud.google.com'], ['Microsoft Azure', 'azure.microsoft.com'],
  ['Hostinger', 'hostinger.com'], ['Bluehost', 'bluehost.com'], ['GoDaddy', 'godaddy.com'], ['Namecheap', 'namecheap.com'],
  ['Docker', 'docker.com'], ['Docker Hub', 'hub.docker.com'], ['npm', 'npmjs.com'], ['PyPI', 'pypi.org'],
  ['Replit', 'replit.com'], ['CodeSandbox', 'codesandbox.io'], ['StackBlitz', 'stackblitz.com'], ['Postman', 'postman.com'],

  // --- Databases & backend ---
  ['Supabase', 'supabase.com'], ['Neon', 'neon.tech'], ['Firebase', 'firebase.google.com'], ['MongoDB Atlas', 'mongodb.com'],
  ['PlanetScale', 'planetscale.com'], ['Turso', 'turso.tech'], ['Upstash', 'upstash.com'], ['Redis', 'redis.io'],
  ['CockroachDB', 'cockroachlabs.com'], ['Appwrite', 'appwrite.io'],

  // --- AI ---
  ['ChatGPT', 'chatgpt.com'], ['OpenAI', 'openai.com'], ['Claude', 'claude.ai'], ['Anthropic', 'anthropic.com'],
  ['Gemini', 'gemini.google.com'], ['Perplexity', 'perplexity.ai'], ['Hugging Face', 'huggingface.co'], ['Midjourney', 'midjourney.com'],
  ['Cursor', 'cursor.com'], ['Lovable', 'lovable.dev'], ['Bolt.new', 'bolt.new'], ['v0', 'v0.dev'],

  // --- Dev tooling, monitoring, auth, email ---
  ['Sentry', 'sentry.io'], ['Datadog', 'datadoghq.com'], ['Grafana', 'grafana.com'], ['New Relic', 'newrelic.com'],
  ['PostHog', 'posthog.com'], ['Mixpanel', 'mixpanel.com'], ['Auth0', 'auth0.com'], ['Clerk', 'clerk.com'], ['Okta', 'okta.com'],
  ['Resend', 'resend.com'], ['SendGrid', 'sendgrid.com'], ['Mailgun', 'mailgun.com'], ['Twilio', 'twilio.com'], ['Mailchimp', 'mailchimp.com'],
  ['Cloudinary', 'cloudinary.com'], ['Algolia', 'algolia.com'], ['Contentful', 'contentful.com'], ['Sanity', 'sanity.io'], ['Strapi', 'strapi.io'],
  ['Webflow', 'webflow.com'], ['Framer', 'framer.com'], ['Wix', 'wix.com'], ['Squarespace', 'squarespace.com'], ['WordPress', 'wordpress.com'],

  // --- Google, Microsoft, Apple ---
  ['Google', 'google.com'], ['Gmail', 'gmail.com'], ['Google Drive', 'drive.google.com'], ['Google Docs', 'docs.google.com'],
  ['Google Photos', 'photos.google.com'], ['Google Meet', 'meet.google.com'], ['YouTube', 'youtube.com'], ['YouTube Music', 'music.youtube.com'],
  ['Microsoft', 'microsoft.com'], ['Outlook', 'outlook.com'], ['OneDrive', 'onedrive.live.com'], ['Microsoft Teams', 'teams.microsoft.com'],
  ['Xbox Live', 'xbox.com'], ['Apple', 'apple.com'], ['iCloud', 'icloud.com'], ['Apple Music', 'music.apple.com'],

  // --- Social & communication ---
  ['Facebook', 'facebook.com'], ['Instagram', 'instagram.com'], ['WhatsApp', 'whatsapp.com'], ['Threads', 'threads.net'],
  ['Twitter / X', 'x.com'], ['LinkedIn', 'linkedin.com'], ['TikTok', 'tiktok.com'], ['Snapchat', 'snapchat.com'],
  ['Pinterest', 'pinterest.com'], ['Reddit', 'reddit.com'], ['Discord', 'discord.com'], ['Slack', 'slack.com'],
  ['Telegram', 'telegram.org'], ['Signal', 'signal.org'], ['Skype', 'skype.com'], ['Zoom', 'zoom.us'],
  ['Bluesky', 'bsky.app'], ['Mastodon', 'mastodon.social'], ['Medium', 'medium.com'], ['Substack', 'substack.com'],
  ['Quora', 'quora.com'], ['Tumblr', 'tumblr.com'], ['Dev.to', 'dev.to'], ['Hashnode', 'hashnode.com'],
  ['Tinder', 'tinder.com'], ['Bumble', 'bumble.com'],

  // --- Productivity & work ---
  ['Notion', 'notion.so'], ['Linear', 'linear.app'], ['Jira', 'atlassian.com'], ['Confluence', 'atlassian.com'], ['Atlassian', 'atlassian.com'],
  ['Trello', 'trello.com'], ['Asana', 'asana.com'], ['ClickUp', 'clickup.com'], ['Monday.com', 'monday.com'], ['Airtable', 'airtable.com'],
  ['Figma', 'figma.com'], ['Canva', 'canva.com'], ['Miro', 'miro.com'], ['Loom', 'loom.com'], ['Calendly', 'calendly.com'],
  ['Zapier', 'zapier.com'], ['Make', 'make.com'], ['n8n', 'n8n.io'], ['Dropbox', 'dropbox.com'], ['Box', 'box.com'],
  ['Evernote', 'evernote.com'], ['Todoist', 'todoist.com'], ['Grammarly', 'grammarly.com'], ['Adobe', 'adobe.com'],
  ['Salesforce', 'salesforce.com'], ['Zoho', 'zoho.com'], ['Proton', 'proton.me'], ['Yahoo', 'yahoo.com'],

  // --- Entertainment & music ---
  ['Netflix', 'netflix.com'], ['Spotify', 'spotify.com'], ['Disney+', 'disneyplus.com'], ['Hotstar', 'hotstar.com'],
  ['Prime Video', 'primevideo.com'], ['Hulu', 'hulu.com'], ['HBO Max', 'max.com'], ['Paramount+', 'paramountplus.com'],
  ['Peacock', 'peacocktv.com'], ['Crunchyroll', 'crunchyroll.com'], ['Twitch', 'twitch.tv'], ['Vimeo', 'vimeo.com'], ['SoundCloud', 'soundcloud.com'],

  // --- Gaming ---
  ['Steam', 'store.steampowered.com'], ['Epic Games', 'epicgames.com'], ['PlayStation Network', 'playstation.com'], ['Nintendo', 'nintendo.com'],
  ['Roblox', 'roblox.com'], ['Ubisoft', 'ubisoft.com'], ['EA', 'ea.com'], ['Battle.net', 'battle.net'], ['itch.io', 'itch.io'], ['NVIDIA', 'nvidia.com'],

  // --- Shopping, travel, food ---
  ['Amazon', 'amazon.com'], ['eBay', 'ebay.com'], ['Walmart', 'walmart.com'], ['Best Buy', 'bestbuy.com'], ['Etsy', 'etsy.com'],
  ['Shopify', 'shopify.com'], ['Target', 'target.com'], ['AliExpress', 'aliexpress.com'], ['Alibaba', 'alibaba.com'], ['Shein', 'shein.com'], ['IKEA', 'ikea.com'],
  ['Flipkart', 'flipkart.com'], ['Myntra', 'myntra.com'], ['Zomato', 'zomato.com'], ['Swiggy', 'swiggy.com'],
  ['Airbnb', 'airbnb.com'], ['Booking.com', 'booking.com'], ['Expedia', 'expedia.com'], ['MakeMyTrip', 'makemytrip.com'], ['IRCTC', 'irctc.co.in'],
  ['Air India', 'airindia.com'], ['Delta', 'delta.com'], ['Uber', 'uber.com'], ['Lyft', 'lyft.com'], ['Ola', 'olacabs.com'], ['DoorDash', 'doordash.com'],

  // --- Payments, banking, crypto, trading ---
  ['PayPal', 'paypal.com'], ['Stripe', 'stripe.com'], ['Razorpay', 'razorpay.com'], ['Paddle', 'paddle.com'], ['Lemon Squeezy', 'lemonsqueezy.com'],
  ['Paytm', 'paytm.com'], ['PhonePe', 'phonepe.com'], ['Wise', 'wise.com'], ['Revolut', 'revolut.com'], ['Payoneer', 'payoneer.com'],
  ['Venmo', 'venmo.com'], ['Cash App', 'cash.app'], ['Chase Bank', 'chase.com'], ['Bank of America', 'bankofamerica.com'], ['Wells Fargo', 'wellsfargo.com'],
  ['Coinbase', 'coinbase.com'], ['Binance', 'binance.com'], ['Robinhood', 'robinhood.com'], ['Zerodha', 'zerodha.com'], ['Groww', 'groww.in'],

  // --- Learning & coding practice ---
  ['Stack Overflow', 'stackoverflow.com'], ['LeetCode', 'leetcode.com'], ['HackerRank', 'hackerrank.com'], ['Kaggle', 'kaggle.com'],
  ['Coursera', 'coursera.org'], ['Udemy', 'udemy.com'], ['Duolingo', 'duolingo.com'],

  // --- VPN & privacy ---
  ['NordVPN', 'nordvpn.com'], ['ExpressVPN', 'expressvpn.com'], ['Proton VPN', 'protonvpn.com'],
];

// Names are unique on their lower-cased form (the first entry wins).
const seen = new Set();
const UNIQUE = SERVICES.filter(([name]) => {
  const key = name.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

export const SITE_SUGGESTIONS = UNIQUE.map(([name]) => name);

export const SITE_DOMAINS = Object.fromEntries(UNIQUE.map(([name, domain]) => [name.toLowerCase(), domain]));

/**
 * Suggestions for what the user has typed so far. Names that start with the text come
 * first, then names with a word starting with it, then anything containing it.
 */
export function suggestSites(query, limit = 7) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SITE_SUGGESTIONS
    .map((name) => {
      const lower = name.toLowerCase();
      const at = lower.indexOf(q);
      if (at < 0 || lower === q) return null;
      const rank = at === 0 ? 0 : /[\s.\-/+]/.test(lower[at - 1]) ? 1 : 2;
      return { name, rank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length)
    .slice(0, limit)
    .map((x) => x.name);
}
