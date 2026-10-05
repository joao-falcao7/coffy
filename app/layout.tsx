import type { Metadata, Viewport } from "next";
import { Fredoka, Space_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// fonte de titulos, nome do mascote e numeros grandes
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "700"],
});

// fonte do laudo, labels e carimbos
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Coffy — Wallet Autopsy",
  description: "Paste your Solana wallet and Coffy performs the autopsy.",
};

export const viewport: Viewport = {
  themeColor: "#241733",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
