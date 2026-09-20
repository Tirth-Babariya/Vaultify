import { Inter } from "next/font/google";
import "./globals.css";
import AuthEvents from "@/components/AuthEvents";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Vaultify | Minimal Password Manager",
  description: "Open-source, zero-knowledge password manager. Keep your vault on this device or sync it across devices, encrypted in your browser.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030303" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const prefs = JSON.parse(localStorage.getItem('vault_settings')) || {};
                if (prefs.accent) {
                  document.documentElement.setAttribute('data-accent', prefs.accent);
                }
                if (prefs.accent === 'rgb') {
                  document.documentElement.style.setProperty('--rgb-duration', Math.round(60 / (prefs.rgbSpeed || 4)) + 's');
                  document.documentElement.style.setProperty('--rgb-spread', String(prefs.rgbSpread ?? 70));
                }
                const mode = prefs.theme || 'dark';
                const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased selection:bg-[var(--foreground)] selection:text-[var(--background)]`}>
        <AuthEvents />
        {children}
      </body>
    </html>
  );
}
