// Common services offered as autocomplete suggestions for the "Website / App"
// field, mapped to their real domain so a favicon lookup can be attempted
// confidently — free-text entries with no dot and no match here fall back to
// the app's own logo instead of guessing a domain (see PasswordCard.jsx).
const SERVICES = [
  ['GitHub', 'github.com'], ['GitLab', 'gitlab.com'], ['Bitbucket', 'bitbucket.org'],
  ['Google', 'google.com'], ['Gmail', 'gmail.com'], ['YouTube', 'youtube.com'], ['Google Drive', 'drive.google.com'],
  ['Microsoft', 'microsoft.com'], ['Outlook', 'outlook.com'], ['OneDrive', 'onedrive.live.com'], ['Xbox Live', 'xbox.com'],
  ['Apple', 'apple.com'], ['iCloud', 'icloud.com'],
  ['Facebook', 'facebook.com'], ['Instagram', 'instagram.com'], ['WhatsApp', 'whatsapp.com'], ['Threads', 'threads.net'],
  ['Twitter / X', 'x.com'], ['LinkedIn', 'linkedin.com'],
  ['TikTok', 'tiktok.com'], ['Snapchat', 'snapchat.com'], ['Pinterest', 'pinterest.com'], ['Reddit', 'reddit.com'],
  ['Discord', 'discord.com'], ['Slack', 'slack.com'], ['Telegram', 'telegram.org'],
  ['Netflix', 'netflix.com'], ['Spotify', 'spotify.com'], ['Disney+', 'disneyplus.com'], ['Prime Video', 'primevideo.com'],
  ['Hulu', 'hulu.com'], ['Twitch', 'twitch.tv'],
  ['Amazon', 'amazon.com'], ['eBay', 'ebay.com'], ['Walmart', 'walmart.com'], ['Best Buy', 'bestbuy.com'],
  ['Etsy', 'etsy.com'], ['Shopify', 'shopify.com'], ['Target', 'target.com'],
  ['PayPal', 'paypal.com'], ['Stripe', 'stripe.com'], ['Chase Bank', 'chase.com'], ['Bank of America', 'bankofamerica.com'],
  ['Wells Fargo', 'wellsfargo.com'], ['Venmo', 'venmo.com'], ['Cash App', 'cash.app'],
  ['Dropbox', 'dropbox.com'], ['Notion', 'notion.so'], ['Figma', 'figma.com'], ['Trello', 'trello.com'],
  ['Asana', 'asana.com'], ['Zoom', 'zoom.us'], ['Canva', 'canva.com'],
  ['Adobe', 'adobe.com'], ['Steam', 'store.steampowered.com'], ['Epic Games', 'epicgames.com'],
  ['PlayStation Network', 'playstation.com'], ['Nintendo', 'nintendo.com'],
  ['Airbnb', 'airbnb.com'], ['Uber', 'uber.com'], ['Lyft', 'lyft.com'], ['DoorDash', 'doordash.com'],
  ['Yahoo', 'yahoo.com'], ['Salesforce', 'salesforce.com'], ['Atlassian', 'atlassian.com'],
];

export const SITE_SUGGESTIONS = SERVICES.map(([name]) => name);

export const SITE_DOMAINS = Object.fromEntries(
  SERVICES.map(([name, domain]) => [name.toLowerCase(), domain])
);
