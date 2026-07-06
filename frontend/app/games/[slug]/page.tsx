import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGameDetail, listGames } from "@/lib/api";

// -- ISR: revalidate at most once per day --
export const revalidate = 86400;
// -- Generate top N pages at build; the rest are built on-demand and cached --
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const top = await listGames(500, 0);
    return top.games.map(g => ({ slug: g.slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameDetail(slug);
  if (!game) return { title: "Not found" };
  const desc = game.short_description.slice(0, 155);
  return {
    title: `${game.name} — recommendations, tags, similar games`,
    description: desc,
    alternates: { canonical: `/games/${slug}` },
    openGraph: {
      title: game.name,
      description: desc,
      images: game.header_image ? [{ url: game.header_image }] : [],
    },
  };
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameDetail(slug);
  if (!game) notFound();

  // JSON-LD structured data: tells Google "this is a VideoGame" for rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description: game.short_description,
    image: game.header_image,
    genre: game.genres,
    operatingSystem: game.platforms.join(", "),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (game.review_score * 5).toFixed(2),
      bestRating: "5",
      worstRating: "1",
      ratingCount: 100,
    },
    offers:
      game.price > 0
        ? {
            "@type": "Offer",
            price: game.price.toFixed(2),
            priceCurrency: "USD",
          }
        : { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  // Breadcrumb schema helps Google render the "Home > Games > X" trail in results.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Browse", item: "/games" },
      { "@type": "ListItem", position: 3, name: game.name, item: `/games/${slug}` },
    ],
  };

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <a href="/" className="hover:text-white">Home</a>
        {" › "}
        <a href="/games" className="hover:text-white">Browse</a>
        {" › "}
        <span className="text-white">{game.name}</span>
      </nav>

      {/* Hero panel with subtle orb backdrop */}
      <div className="relative overflow-visible">
        <div className="orb bg-accent w-[280px] h-[280px] -top-10 -left-10 opacity-30 pointer-events-none" />
        <div className="orb bg-gold w-[220px] h-[220px] top-20 right-0 opacity-20 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row gap-6">
          {game.header_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.header_image}
              alt={game.name}
              className="md:w-1/2 aspect-[460/215] object-cover rounded-xl border border-border shadow-2xl shadow-accent/20"
            />
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              {game.name}
            </h1>
            <div className="text-sm text-muted mb-4 flex flex-wrap gap-x-2">
              <span className="text-gold font-medium">
                {game.price === 0 ? "Free" : `$${game.price.toFixed(2)}`}
              </span>
              <span>·</span>
              <span>{(game.review_score * 100).toFixed(0)}% positive</span>
              <span>·</span>
              <span>{game.platforms.join(", ")}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {game.genres.map(g => (
                <span
                  key={g}
                  className="text-xs border border-accent/30 bg-accent/10 text-accent rounded px-2 py-0.5"
                >
                  {g}
                </span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-muted">{game.short_description}</p>
            {game.steam_url && (
              <a
                href={game.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-glow text-white rounded-xl px-5 py-2 font-medium no-underline inline-flex items-center gap-2 mt-5 shadow-lg shadow-accent/40 hover:shadow-accent/70 transition-shadow"
              >
                Get game <span>↗</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold text-white mb-3">
          <span className="text-gold">#</span> Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {game.tags.map(t => (
            <span
              key={t}
              className="text-xs bg-panel border border-border rounded-full px-3 py-1 hover:border-accent transition-colors"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-3">
          Similar <span className="text-gold">games</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {game.similar.map(s => (
            <a
              key={s.app_id}
              href={`/games/${s.slug}`}
              className="tilt-card flex gap-3 bg-panel border border-border rounded-lg p-3 no-underline"
            >
              {s.header_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.header_image}
                  alt={s.name}
                  className="w-32 aspect-[460/215] object-cover rounded"
                />
              )}
              <div>
                <div className="font-medium text-white">{s.name}</div>
                <div className="text-xs text-muted mt-1">
                  {s.tags.slice(0, 3).join(" · ")}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </article>
  );
}
