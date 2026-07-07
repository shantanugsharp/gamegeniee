"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/lib/types";
import { tasteSummary } from "@/lib/api";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<{ count: number; summary: string; liked: Game[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("uid");
    if (!uid) {
      setLoading(false);
      return;
    }
    setUserId(uid);
    tasteSummary(uid)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-8">
      <div className="relative">
        <div className="orb bg-accent w-[320px] h-[320px] -top-8 -left-8 opacity-25 pointer-events-none" />
        <div className="orb bg-gold w-[240px] h-[240px] top-6 right-4 opacity-15 pointer-events-none" />
        <div className="relative">
          <div className="inline-block text-xs uppercase tracking-widest text-gold mb-3">
            ✦ your genie profile
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
            Your{" "}
            <span
              className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1"
              style={{ WebkitTextFillColor: "transparent" }}
            >
              taste
            </span>
          </h1>
          <p className="text-muted max-w-xl">
            Based on your thumbs-ups across sessions. Stored locally in your browser — no account
            needed.
          </p>
        </div>
      </div>

      {loading && <div className="text-muted">Loading your profile…</div>}

      {!loading && !userId && (
        <div className="bg-panel border border-border rounded-2xl p-6">
          Open a chat and thumb-up a few games to build your taste profile.
        </div>
      )}

      {!loading && userId && data && (
        <>
          <section className="bg-panel border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-40 h-40 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-gold mb-2">
                ✦ your taste summary
              </div>
              <div className="text-lg text-white leading-relaxed whitespace-pre-line">
                {data.summary}
              </div>
              <div className="text-xs text-muted mt-4">
                Based on {data.count} liked {data.count === 1 ? "game" : "games"}.
              </div>
            </div>
          </section>

          {data.liked.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                Games <span className="text-gold">you loved</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.liked.slice(0, 12).map(g => (
                  <a
                    key={g.app_id}
                    href={`/games/${g.slug}`}
                    className="tilt-card flex gap-3 bg-panel border border-border rounded-lg p-3 no-underline"
                  >
                    {g.header_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.header_image}
                        alt={g.name}
                        className="w-28 aspect-[460/215] object-cover rounded"
                      />
                    )}
                    <div>
                      <div className="text-white font-medium">{g.name}</div>
                      <div className="text-xs text-muted mt-1">
                        {(g.tags || []).slice(0, 3).join(" · ")}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
