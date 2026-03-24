import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Vaultify | Minimal Password Manager",
  description: "Secure, minimal, and local password management.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const prefs = JSON.parse(localStorage.getItem('vault_settings'));
                if (prefs && prefs.accent) {
                  document.documentElement.setAttribute('data-accent', prefs.accent);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased selection:bg-foreground selection:text-background`}>
        {children}
      </body>
    </html>
  );
}
