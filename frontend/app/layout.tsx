import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GameGenie — your wish, our recommendation",
    template: "%s · GameGenie",
  },
  description:
    "Make a wish, get a game. GameGenie is an AI recommender over 56,000+ PC games. Personalized picks with rationales grounded in real tags.",
  openGraph: {
    type: "website",
    siteName: "GameGenie",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  verification: {
    google: "rHyoJmjfdNaobAqDzVrqu2aJ-mzr1SH47kk3i-Hagqc",
    other: {
      "msvalidate.01": "EC343638B9D754D2793CBA84EC1173F5",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border sticky top-0 z-40 backdrop-blur bg-bg/80">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-lg font-bold text-white no-underline flex items-center gap-2 group">
              <span className="text-accent group-hover:text-gold transition-colors">✦</span>
              GameGenie
            </a>
            <nav className="text-sm flex items-center gap-6">
              {[
                { href: "/chat", label: "Chat" },
                { href: "/genres", label: "Genres" },
                { href: "/games", label: "Browse" },
                { href: "/about", label: "About" },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="no-underline text-muted hover:text-white transition-colors relative
                             after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5
                             after:w-0 hover:after:w-full after:bg-accent after:transition-all"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-border mt-16">
          <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-muted">
            GameGenie · AI-powered game recommendations.
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
