import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { PublicModeToggle } from "@/components/public-mode-toggle";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agentlamy.com"),
  title: {
    default: "AEO Command - LLM Visibility & AEO Audit Tool",
    template: "%s | AEO Command",
  },
  description:
    "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AEO Command - LLM Visibility & AEO Audit Tool",
    description:
      "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
    url: "/",
    siteName: "AEO Command",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "AEO Command - LLM Visibility & AEO Audit",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AEO Command - LLM Visibility & AEO Audit Tool",
    description: "See how AI recommends your business vs. competitors.",
    images: ["/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={bodyFont.variable}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1}>
          <div className="shell">
            <header className="topbar">
              <Link href="/" className="wordmark" aria-label="AEO Command - go to scanner">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="wordmark-logo"
                  height={36}
                  priority
                  src="/brand-logo.png"
                  width={36}
                />
                <div>
                  <h1>AEO Command</h1>
                </div>
              </Link>
              <nav className="topnav" aria-label="Primary">
                <PublicModeToggle />
              </nav>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
