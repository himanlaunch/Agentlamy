import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { hasDatabaseConfig } from "@/lib/env";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agentlamy.com"),
  title: {
    default: "AgentLamy - LLM Visibility & AEO Audit Tool",
    template: "%s | AgentLamy",
  },
  description:
    "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AgentLamy - LLM Visibility & AEO Audit Tool",
    description:
      "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
    url: "/",
    siteName: "AgentLamy",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "AgentLamy - LLM Visibility & AEO Audit",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentLamy - LLM Visibility & AEO Audit Tool",
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
  const session = hasDatabaseConfig() ? await auth() : null;
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <html lang="en">
      <body className={bodyFont.variable}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1}>
          <div className="shell">
            <header className="topbar">
              <Link href="/" className="wordmark" aria-label="AgentLamy - go to scanner">
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
                  <h1>AgentLamy</h1>
                </div>
              </Link>
              <nav className="topnav" aria-label="Primary">
                <Link className="nav-link" href="/batch">Batch</Link>
                <Link className="nav-link" href="/about">About</Link>
                <Link className="nav-link" href="/demo">Demo</Link>
                <Link className="nav-link" href="/pricing">Pricing</Link>
                <Link className="nav-link" href="/status">Status</Link>
                {isSignedIn && (
                  <Link className="nav-link nav-status" href="/dashboard">Dashboard</Link>
                )}
              </nav>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
