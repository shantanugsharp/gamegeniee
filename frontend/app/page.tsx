import type { Metadata } from "next";
import { listGenres, listGames } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import SurpriseButton from "@/components/SurpriseButton";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "GameGenie — your wish, our recommendation",
  description:
    "Make a wish. GameGenie is a free AI recommender over 56,000+ PC games. Tell it a vibe, budget, or mood — get personalized picks with rationales grounded in real tags.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GameGenie",
    description:
      "Free AI game recommender over 56,000+ PC titles. Make a wish, get a game.",
    type: "website",
    url: SITE_URL,
  },
};

export default async function LandingPage() {
  let featuredGenres: { slug: string; count: number }[] = [];
  let featuredGames: Awaited<ReturnType<typeof listGames>>["games"] = [];
  try {
    const g = await listGenres();
    featuredGenres = g.genres.slice(0, 10);
  } catch {}
  try {
    const gm = await listGames(9, 0);
    featuredGames = gm.games;
  } catch {}

  // Top 3 games for the 3D floating stack in the hero — real game art, real depth.
  const heroStack = featuredGames.slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GameGenie",
    url: SITE_URL,
    description:
      "Free AI game recommender searching 56,000+ PC games with hybrid retrieval and LLM rationales.",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="space-y-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============ HERO ============ */}
      <section className="relative -mt-8 pt-16 md:pt-24 pb-16">
        {/* Animated gradient orbs behind the content — fully in-bounds so they
            radiate outward without being clipped by any overflow rule. */}
        <div className="orb bg-accent w-[420px] h-[420px] top-8 left-4 animate-orb-drift" />
        <div className="orb bg-gold   w-[380px] h-[380px] top-32 right-6 animate-orb-drift [animation-delay:-8s]" />
        <div className="orb bg-accent w-[280px] h-[280px] bottom-4 left-1/3 opacity-30 animate-orb-drift [animation-delay:-14s]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* ---- Left column: copy + CTA ---- */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1 mb-6">
              <span className="animate-sparkle-spin inline-block">✦</span>
              56,000+ games · free · no sign-up
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.15] tracking-tight">
              Make a wish.
              <br />
              <span
                className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-2"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                Get the game.
              </span>
            </h1>
            <p className="text-lg text-muted mt-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              GameGenie searches thousands of PC games from a single sentence.
              Tell it a mood, budget, or vibe — get personalized picks with rationales
              grounded in real tags.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center lg:justify-start">
              <a
                href="/chat"
                className="cta-glow text-white rounded-xl px-8 py-4 font-semibold no-underline
                           shadow-lg shadow-accent/40 hover:shadow-accent/70 transition-shadow
                           flex items-center gap-2"
              >
                Make a wish
                <span className="text-lg">→</span>
              </a>
              <SurpriseButton variant="cta" />
              <a
                href="/genres"
                className="text-muted hover:text-white text-sm no-underline underline-offset-4 hover:underline"
              >
                or browse by genre
              </a>
            </div>

            {/* Example queries */}
            <div className="mt-10 flex gap-2 flex-wrap justify-center lg:justify-start max-w-xl mx-auto lg:mx-0">
              {[
                "I wish for a chill co-op puzzle",
                "story-driven RPG under $30",
                "surprise me with a roguelike",
                "cozy indie like Stardew Valley",
              ].map(q => (
                <a
                  key={q}
                  href={`/chat?q=${encodeURIComponent(q)}`}
                  className="text-xs bg-panel/70 backdrop-blur border border-border rounded-full
                             px-3 py-1.5 no-underline hover:border-accent hover:bg-accent/10
                             text-muted hover:text-white transition-all"
                >
                  “{q}”
                </a>
              ))}
            </div>
          </div>

          {/* ---- Right column: floating 3D card stack ---- */}
          {heroStack.length > 0 && (
            <div className="relative h-[420px] hidden lg:block perspective-1200">
              <div className="relative w-full h-full preserve-3d">
                {heroStack.map((g, i) => {
                  // Stack transforms — each card shifted + rotated in 3D space
                  const offsets = [
                    { x: -40, y: -40, rot: -8, rx: 6, z: 20, delay: "0s" },
                    { x: 40,  y: 20,  rot: 6,  rx: -4, z: 0,  delay: "-3s" },
                    { x: -20, y: 90,  rot: -3, rx: 3,  z: -20, delay: "-6s" },
                  ][i];
                  const anim = i % 2 === 0 ? "animate-float" : "animate-float-slow";
                  return (
                    <div
                      key={g.app_id}
                      className={`absolute inset-0 flex items-center justify-center ${anim}`}
                      style={{ animationDelay: offsets.delay }}
                    >
                      <a
                        href={`/games/${g.slug}`}
                        className="block w-[380px] rounded-2xl overflow-hidden border border-border
                                   bg-panel shadow-2xl no-underline hover:shadow-accent/40 transition-shadow"
                        style={{
                          transform: `translate3d(${offsets.x}px, ${offsets.y}px, ${offsets.z}px) rotate(${offsets.rot}deg) rotateX(${offsets.rx}deg)`,
                        }}
                      >
                        {g.header_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.header_image}
                            alt={g.name}
                            className="w-full aspect-[460/215] object-cover"
                          />
                        )}
                        <div className="p-3">
                          <div className="text-sm font-medium text-white truncate">{g.name}</div>
                          <div className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">
                            featured
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-t border-border pt-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-gold mb-2">how it works</div>
          <h2 className="text-4xl font-bold text-white">
            Three wishes. <span className="text-accent">One game.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              icon: "✦",
              title: "Make a wish",
              body: "Type any way you like — a mood (‘cozy’), a genre (‘roguelike’), a constraint (‘under $20 co-op on Mac’), or negation (‘not horror’).",
            },
            {
              n: "02",
              icon: "🧞",
              title: "The genie thinks",
              body: "An LLM extracts filters; hybrid BM25 + vector search narrows the catalog; a reranker and MMR pick a diverse slate.",
            },
            {
              n: "03",
              icon: "⭐",
              title: "Wish granted",
              body: "Every card explains why it matches, citing real tags. Thumbs-up shapes your future wishes across sessions.",
            },
          ].map(step => (
            <div
              key={step.n}
              className="tilt-card bg-panel border border-border rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4 relative">
                <div className="text-accent font-mono text-sm">{step.n}</div>
                <div className="text-2xl">{step.icon}</div>
              </div>
              <div className="text-white font-semibold text-lg mb-2 relative">{step.title}</div>
              <div className="text-muted text-sm leading-relaxed relative">{step.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURED GENRES ============ */}
      {featuredGenres.length > 0 && (
        <section className="border-t border-border pt-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">
              Popular <span className="text-gold">genres</span>
            </h2>
            <a href="/genres" className="text-sm text-accent no-underline hover:underline">
              See all →
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {featuredGenres.map(g => (
              <a
                key={g.slug}
                href={`/genres/${encodeURIComponent(g.slug)}`}
                className="bg-panel border border-border rounded-lg px-4 py-2 no-underline
                           hover:border-accent hover:bg-accent/5 transition-all
                           hover:-translate-y-0.5"
              >
                <span className="text-white capitalize">{g.slug}</span>{" "}
                <span className="text-xs text-muted">{g.count.toLocaleString()}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ============ FEATURED GAMES ============ */}
      {featuredGames.length > 0 && (
        <section className="border-t border-border pt-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">
              Top <span className="text-gold">rated</span>
            </h2>
            <a href="/games" className="text-sm text-accent no-underline hover:underline">
              Browse all →
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featuredGames.slice(0, 6).map(g => (
              <a
                key={g.app_id}
                href={`/games/${g.slug}`}
                className="tilt-card bg-panel border border-border rounded-xl overflow-hidden no-underline"
              >
                {g.header_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.header_image}
                    alt={g.name}
                    className="w-full aspect-[460/215] object-cover"
                  />
                )}
                <div className="p-3">
                  <div className="text-white font-medium truncate">{g.name}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ============ FINAL CTA ============ */}
      <section className="border-t border-border pt-16 pb-8 text-center relative overflow-hidden">
        <div className="orb bg-accent w-[400px] h-[400px] -top-16 left-1/2 -translate-x-1/2 opacity-30 animate-orb-drift" />
        <div className="relative">
          <div className="text-4xl mb-4 animate-sparkle-spin inline-block">✦</div>
          <h2 className="text-4xl font-bold text-white mb-3">
            Your wish is <span className="text-gold">waiting.</span>
          </h2>
          <p className="text-muted mb-8 max-w-lg mx-auto">
            Free. No sign-up. Works instantly. Your taste improves with every thumbs-up.
          </p>
          <a
            href="/chat"
            className="cta-glow text-white rounded-xl px-8 py-4 font-semibold no-underline inline-flex items-center gap-2 shadow-lg shadow-accent/40 hover:shadow-accent/70 transition-shadow"
          >
            Make a wish
            <span className="text-lg">→</span>
          </a>
        </div>
      </section>
    </div>
  );
}
