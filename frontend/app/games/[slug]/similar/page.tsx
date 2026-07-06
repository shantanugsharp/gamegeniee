import type { Metadata } from "next";
import { getGameDetail } from "@/lib/api";
import { notFound } from "next/navigation";

export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameDetail(slug);
  if (!game) return { title: "Not found" };
  return {
    title: `Games like ${game.name} — similar titles ranked by taste`,
    description: `Curated list of games similar to ${game.name}. Ranked by shared tags, genres, and player overlap. Free recommender.`,
    alternates: { canonical: `/games/${slug}/similar` },
  };
}

export default async function SimilarPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameDetail(slug);
  if (!game) notFound();

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="orb bg-accent w-[280px] h-[280px] -top-6 -left-6 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[200px] h-[200px] top-8 right-8 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ if you liked
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Games like{" "}
            <span className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1" style={{ WebkitTextFillColor: "transparent" }}>
              {game.name}
            </span>
          </h1>
          <p className="text-muted max-w-2xl">
            Titles with similar tags and gameplay. Click any card to see its own recommendations.
          </p>
          <a
            href={`/games/${slug}`}
            className="text-sm text-accent hover:underline mt-3 inline-block"
          >
            ← Back to {game.name}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {game.similar.map(s => (
          <a
            key={s.app_id}
            href={`/games/${s.slug}`}
            className="tilt-card bg-panel border border-border rounded-xl overflow-hidden no-underline"
          >
            {s.header_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.header_image}
                alt={s.name}
                className="w-full aspect-[460/215] object-cover"
              />
            )}
            <div className="p-3">
              <div className="font-medium text-white">{s.name}</div>
              <div className="text-xs text-muted mt-1">
                {s.tags.slice(0, 3).join(" · ")}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
