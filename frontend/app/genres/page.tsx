import { listGenres } from "@/lib/api";

export const metadata = {
  title: "Browse games by genre — 40+ genres from 56,000+ titles",
  description:
    "Discover PC games by genre: roguelike, RPG, strategy, puzzle, horror, indie, and more. Curated from 56,000+ titles.",
  alternates: { canonical: "/genres" },
};

export const revalidate = 86400;

export default async function GenresIndex() {
  const { genres } = await listGenres();
  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="orb bg-accent w-[320px] h-[320px] -top-8 -left-8 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[240px] h-[240px] top-6 right-4 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ every flavor
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
            Browse by{" "}
            <span className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1" style={{ WebkitTextFillColor: "transparent" }}>
              genre
            </span>
          </h1>
          <p className="text-muted max-w-xl">
            Every genre has hundreds — sometimes tens of thousands — of titles in our index.
            Pick your poison.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {genres.map(g => (
          <a
            key={g.slug}
            href={`/genres/${encodeURIComponent(g.slug)}`}
            className="tilt-card bg-panel border border-border rounded-xl p-4 no-underline"
          >
            <div className="text-white capitalize font-medium">{g.slug}</div>
            <div className="text-xs text-gold mt-1">{g.count.toLocaleString()} games</div>
          </a>
        ))}
      </div>
    </div>
  );
}
