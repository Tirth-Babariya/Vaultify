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
      <body className={`${inter.className} antialiased selection:bg-foreground selection:text-background`}>
        <Navbar />
        <main className="min-h-screen pt-20 pb-10 px-4 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
