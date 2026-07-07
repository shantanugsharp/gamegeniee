import type { Metadata } from "next";
import { posts } from "@/content/blog";

export const metadata: Metadata = {
  title: "GameGenie Blog — thoughts on games, taste, and how it works",
  description:
    "Curated game lists, deep-dives on genres, and behind-the-scenes technical notes about how GameGenie recommends.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 86400;

export default function BlogIndex() {
  return (
    <div className="space-y-8 pb-8">
      <div className="relative">
        <div className="orb bg-accent w-[320px] h-[320px] -top-8 -left-8 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[240px] h-[240px] top-6 right-4 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ from the genie
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            The{" "}
            <span
              className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1"
              style={{ WebkitTextFillColor: "transparent" }}
            >
              blog
            </span>
          </h1>
          <p className="text-muted max-w-xl">
            Curated lists, deep-dives on genres, and behind-the-scenes technical notes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(p => (
          <a
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="tilt-card bg-panel border border-border rounded-2xl p-5 no-underline block"
          >
            <div className="text-xs text-gold uppercase tracking-wider mb-2">
              {p.tags.slice(0, 2).join(" · ")}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{p.title}</h2>
            <p className="text-sm text-muted mb-3">{p.excerpt}</p>
            <div className="text-xs text-muted">
              {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" · "}
              {p.readMinutes} min read
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
