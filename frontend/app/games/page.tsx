import { listGames } from "@/lib/api";

export const metadata = {
  title: "Browse all games — most popular PC titles",
  description: "Browse the most popular PC games in the GameGenie index.",
  alternates: { canonical: "/games" },
};

export const revalidate = 86400;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const perPage = 60;
  const { total, games } = await listGames(perPage, (page - 1) * perPage);
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="orb bg-accent w-[320px] h-[320px] -top-8 -left-8 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[240px] h-[240px] top-6 right-4 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ all titles
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
            Browse{" "}
            <span className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1" style={{ WebkitTextFillColor: "transparent" }}>
              {total.toLocaleString()}
            </span>{" "}
            games
          </h1>
          <p className="text-muted">
            Sorted by popularity. Click any title for details and similar games.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {games.map(g => (
          <a
            key={g.app_id}
            href={`/games/${g.slug}`}
            className="tilt-card bg-panel border border-border rounded-xl overflow-hidden no-underline group"
          >
            {g.header_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.header_image}
                alt={g.name}
                loading="lazy"
                className="w-full aspect-[460/215] object-cover group-hover:brightness-110 transition-[filter]"
              />
            ) : (
              <div className="w-full aspect-[460/215] bg-gradient-to-br from-accent/15 to-gold/10 flex items-center justify-center text-2xl">
                🎮
              </div>
            )}
            <div className="p-3">
              <div className="text-white font-medium text-sm truncate">{g.name}</div>
              {typeof g.review_score === "number" && (
                <div className="text-[11px] text-muted mt-0.5">
                  {(g.review_score * 100).toFixed(0)}% positive
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
      <div className="flex justify-between mt-8 text-sm items-center">
        {page > 1 ? (
          <a
            href={`/games?page=${page - 1}`}
            className="bg-panel border border-border hover:border-accent rounded-xl px-4 py-2 no-underline text-white transition-colors"
          >
            ← Previous
          </a>
        ) : (
          <span />
        )}
        <span className="text-muted">
          Page <span className="text-white">{page}</span> of {totalPages}
        </span>
        {page < totalPages && (
          <a
            href={`/games?page=${page + 1}`}
            className="bg-panel border border-border hover:border-accent rounded-xl px-4 py-2 no-underline text-white transition-colors"
          >
            Next →
          </a>
        )}
      </div>
    </div>
  );
}
