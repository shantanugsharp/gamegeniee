import { listGenres } from "@/lib/api";

export const metadata = {
  title: "Browse games by genre — 40+ genres from 56,000+ titles",
  description:
    "Discover PC games by genre: roguelike, RPG, strategy, puzzle, horror, indie, and more. Curated from 56,000+ titles.",
  alternates: { canonical: "/genres" },
};

export const revalidate = 86400;

const GENRE_ICONS: Record<string, string> = {
  action: "⚔️", adventure: "🗺️", rpg: "🐉", strategy: "♟️", simulation: "🏗️",
  puzzle: "🧩", indie: "🎨", casual: "🍵", racing: "🏎️", sports: "🏆",
  horror: "👻", "story rich": "📖", atmospheric: "🌌", roguelike: "💀",
  "co-op": "🤝", multiplayer: "🌐", singleplayer: "🎯", "2d": "🕹️",
  "3d": "🧊", platformer: "🍄", shooter: "🔫", survival: "🏕️",
  "open world": "🌍", fantasy: "🧙", "sci-fi": "🚀", anime: "🌸",
  "pixel graphics": "👾", "visual novel": "💬", vr: "🥽", music: "🎵",
};

function genreIcon(slug: string) {
  return GENRE_ICONS[slug.toLowerCase()] ?? "🎮";
}

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
            className="tilt-card group relative bg-panel border border-border rounded-xl p-4 no-underline overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-2xl mb-2">{genreIcon(g.slug)}</div>
              <div className="text-white capitalize font-medium">{g.slug}</div>
              <div className="text-xs text-gold mt-1">{g.count.toLocaleString()} games</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
