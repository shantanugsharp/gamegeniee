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
        <div className="aurora" aria-hidden="true" />
        <div className="noise" aria-hidden="true" />
        <header className="border-b border-border/70 sticky top-0 z-40 backdrop-blur-xl bg-bg/60
                           shadow-[0_1px_0_rgba(124,92,255,0.15),0_8px_24px_-16px_rgba(0,0,0,0.8)]">
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
                { href: "/blog", label: "Blog" },
                { href: "/profile", label: "You" },
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
        <footer className="border-t border-border mt-16 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
            <div className="flex items-center gap-2">
              <span className="text-accent">✦</span>
              <span className="text-white font-semibold">GameGenie</span>
              <span className="hidden sm:inline">· your wish, our recommendation</span>
            </div>
            <nav className="flex items-center gap-5">
              {[
                { href: "/chat", label: "Chat" },
                { href: "/games", label: "Browse" },
                { href: "/blog", label: "Blog" },
                { href: "/about", label: "About" },
              ].map(l => (
                <a key={l.href} href={l.href} className="no-underline text-muted hover:text-white transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
