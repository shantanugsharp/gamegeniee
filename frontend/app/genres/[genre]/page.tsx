import type { Metadata } from "next";
import { listGamesByGenre, listGenres, explainGenre } from "@/lib/api";
import { notFound } from "next/navigation";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const { genres } = await listGenres();
    return genres.slice(0, 40).map(g => ({ genre: g.slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ genre: string }> };

function titleCase(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { genre } = await params;
  const decoded = decodeURIComponent(genre);
  const title = titleCase(decoded);
  return {
    title: `Best ${title} games — top-rated ${title.toLowerCase()} picks`,
    description: `The most-loved ${title.toLowerCase()} games — hand-ranked from 56,000+ titles by review count and rating. Free game recommender.`,
    alternates: { canonical: `/genres/${encodeURIComponent(genre)}` },
  };
}

export default async function GenreLandingPage({ params }: Props) {
  const { genre } = await params;
  const decoded = decodeURIComponent(genre);
  const title = titleCase(decoded);
  let data;
  let genreInfo: { explanation: string } | null = null;
  try {
    data = await listGamesByGenre(decoded, 60, 0);
  } catch {
    notFound();
  }
  if (!data || data.total === 0) notFound();
  try {
    genreInfo = await explainGenre(decoded);
  } catch {
    genreInfo = null;
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Genres", item: "/genres" },
      { "@type": "ListItem", position: 3, name: title, item: `/genres/${encodeURIComponent(genre)}` },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <a href="/" className="hover:text-white">Home</a>
        {" › "}
        <a href="/genres" className="hover:text-white">Genres</a>
        {" › "}
        <span className="text-white">{title}</span>
      </nav>
      <div className="relative">
        <div className="orb bg-accent w-[300px] h-[300px] -top-6 -left-6 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[220px] h-[220px] top-4 right-4 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ genre spotlight
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Best{" "}
            <span className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1" style={{ WebkitTextFillColor: "transparent" }}>
              {title}
            </span>{" "}
            games
          </h1>
          <p className="text-muted max-w-2xl">
            Top {title.toLowerCase()} games, ranked by review score and popularity —
            drawn from <span className="text-white font-medium">{data.total.toLocaleString()}</span> titles in our index.
          </p>
        </div>
      </div>
      {genreInfo?.explanation && (
        <section className="bg-panel border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-gold mb-2">
              ✦ what is a {title.toLowerCase()} game?
            </div>
            <div className="text-sm text-white/90 leading-relaxed whitespace-pre-line">
              {genreInfo.explanation}
            </div>
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.games.map(g => (
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
              <div className="font-medium text-white">{g.name}</div>
              <div className="text-xs text-muted mt-1">
                {(g.review_score * 100).toFixed(0)}% · {g.positive_reviews.toLocaleString()} reviews
              </div>
              <div className="text-xs text-muted mt-1 line-clamp-2">
                {g.short_description}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
