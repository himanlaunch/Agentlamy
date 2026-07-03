import type { Metadata } from "next";
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
  title: {
    default: "AEO Command - LLM Visibility & AEO Audit Tool",
    template: "%s | AEO Command",
  },
  description:
    "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
  metadataBase: new URL("https://web-eta-gules-43.vercel.app"),
  openGraph: {
    title: "AEO Command - LLM Visibility & AEO Audit Tool",
    description:
      "Run a free AEO and LLM visibility audit for any website. See how AI recommends your business vs. competitors instantly.",
    url: "https://web-eta-gules-43.vercel.app",
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
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
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
                <span className="wordmark-mark" aria-hidden="true" />
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
