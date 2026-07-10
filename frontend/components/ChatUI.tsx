"use client";

import { useEffect, useState } from "react";
import { clientChat, clientFeedback, clientQueryFeedback } from "@/lib/api";
import type { ChatResponse, Game, Tier } from "@/lib/types";
import SurpriseButton from "@/components/SurpriseButton";

function TierBadge({ tier }: { tier: Tier }) {
  const style: Record<Tier, string> = {
    aaa: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    indie: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    mid: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  };
  const label: Record<Tier, string> = { aaa: "AAA", indie: "Indie", mid: "Popular" };
  return (
    <span className={`text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${style[tier]}`}>
      {label[tier]}
    </span>
  );
}

type Turn = {
  role: "user" | "assistant";
  content: string;
  recs?: Game[];
  kind?: "chat" | "recs" | "clarify";
  query?: string; // stores the user's original query for "not what I asked" feedback
};

const LS_UID = "uid";
const LS_TURNS = "chat_turns_v1";

function useUserId(): string {
  const [id, setId] = useState<string>("");
  useEffect(() => {
    let v = localStorage.getItem(LS_UID);
    if (!v) {
      v = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(LS_UID, v);
    }
    setId(v);
  }, []);
  return id;
}

export default function ChatUI() {
  const userId = useUserId();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");

  // Load persisted chat on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_TURNS);
      if (saved) setTurns(JSON.parse(saved));
    } catch {}
  }, []);

  // Auto-submit ?q=... from URL (landing-page example query links)
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      // strip param from URL so refresh doesn't re-submit
      window.history.replaceState({}, "", window.location.pathname);
      submit(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_TURNS, JSON.stringify(turns));
    } catch {}
  }, [turns]);

  const suggestions = [
    "chill co-op puzzle for tonight",
    "story-driven single-player RPG under $30",
    "roguelike deckbuilder",
    "cozy indie game like Stardew Valley",
  ];

  async function submit(msg: string) {
    if (!msg.trim() || !userId || busy) return;
    setBusy(true);
    setStage("Understanding your request…");
    const nextTurns: Turn[] = [...turns, { role: "user", content: msg }];
    setTurns(nextTurns);
    setInput("");
    try {
      const history = nextTurns.slice(0, -1).map(t => ({ role: t.role, content: t.content }));
      // pass most recent rec slate for chat/follow-up grounding
      const lastRecTurn = [...turns].reverse().find(t => t.recs && t.recs.length);
      const recent_games = (lastRecTurn?.recs ?? []).slice(0, 6).map(g => ({
        name: g.name,
        genres: g.genres,
        tags: g.tags,
        is_multiplayer: g.is_multiplayer,
      }));

      // Fake step progression — the real pipeline runs in one round-trip,
      // but showing stages tells users we're doing more than "waiting".
      setTimeout(() => setStage("Filtering + ranking…"), 400);
      setTimeout(() => setStage("Writing rationales…"), 1200);

      const res: ChatResponse = await clientChat({
        user_id: userId,
        message: msg,
        history,
        recent_games,
        top_n: 6,
      });

      const kind: Turn["kind"] =
        res.type === "recommendations" ? "recs" : res.type === "chat" ? "chat" : "clarify";

      const assistant: Turn = {
        role: "assistant",
        content: res.message,
        recs: res.type === "recommendations" ? res.recommendations : [],
        kind,
        query: msg,
      };
      setTurns([...nextTurns, assistant]);
    } catch {
      setTurns([
        ...nextTurns,
        { role: "assistant", content: "Something went wrong. Try again.", kind: "chat" },
      ]);
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function feedback(app_id: number, kind: "like" | "dislike") {
    await clientFeedback({ user_id: userId, app_id, kind });
  }

  function newChat() {
    setTurns([]);
    localStorage.removeItem(LS_TURNS);
  }

  return (
    <div className="space-y-6">
      {turns.length === 0 && (
        <div className="relative pt-4 pb-8">
          <div className="orb bg-accent w-[300px] h-[300px] -top-8 -left-8 opacity-40 animate-orb-drift pointer-events-none" />
          <div className="orb bg-gold w-[280px] h-[280px] top-10 right-0 opacity-25 animate-orb-drift [animation-delay:-6s] pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1 mb-6">
              <span className="animate-sparkle-spin inline-block">✦</span>
              tell the genie
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white leading-tight">
              What do you{" "}
              <span className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-1" style={{ WebkitTextFillColor: "transparent" }}>
                wish
              </span>{" "}
              to play?
            </h1>
            <p className="text-muted mb-6 max-w-xl">
              Tell me a mood, genre, budget, or vibe. I&apos;ll match against 56,000+ PC games.
            </p>
            <div className="flex gap-2 flex-wrap items-center">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-sm bg-panel/70 backdrop-blur border border-border rounded-full px-3 py-1.5
                             hover:border-accent hover:bg-accent/10 text-muted hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
              <SurpriseButton variant="chip" />
            </div>
          </div>
        </div>
      )}

      {turns.length > 0 && (
        <div className="flex justify-end">
          <button onClick={newChat} className="text-xs text-muted hover:text-white">
            Start a new chat ↺
          </button>
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i}>
          {t.role === "user" ? (
            <div className="flex justify-end">
              <div className="bg-accent/20 border border-accent/40 rounded-2xl px-4 py-2 max-w-xl">
                {t.content}
              </div>
            </div>
          ) : t.kind === "recs" && (t.recs ?? []).length > 0 ? (
            <div>
              <div className="text-sm text-muted mb-3 flex items-center justify-between">
                <span>{t.content}</span>
                <button
                  onClick={() => {
                    if (t.query) {
                      clientQueryFeedback({ user_id: userId, query: t.query, note: "wrong match" });
                      alert("Noted — this query will help us tune the search.");
                    }
                  }}
                  className="text-xs text-muted hover:text-red-300"
                >
                  Not what I asked?
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(t.recs ?? []).map(g => (
                  <RecCard
                    key={g.app_id}
                    game={g}
                    onFeedback={feedback}
                    onMoreLikeThis={() => submit(`games like ${g.name}`)}
                  />
                ))}
              </div>
            </div>
          ) : t.kind === "recs" && (t.recs ?? []).length === 0 ? (
            <div className="bg-panel border border-border rounded-2xl px-4 py-3 max-w-2xl text-sm">
              No matches with those filters. Try loosening the tier or dropping a constraint —
              e.g. try{" "}
              <button
                onClick={() => submit(t.query || "surprise me")}
                className="text-accent hover:underline"
              >
                &quot;{t.query}&quot; without price/tier filters
              </button>
              .
            </div>
          ) : (
            <div className="bg-panel border border-border rounded-2xl px-4 py-3 max-w-2xl text-sm">
              {t.content}
            </div>
          )}
        </div>
      ))}

      {busy && (
        <div className="text-sm text-muted italic flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
          {stage || "Working…"}
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-4 bg-panel/90 backdrop-blur border border-border rounded-2xl p-2 flex gap-2
                   focus-within:border-accent focus-within:shadow-lg focus-within:shadow-accent/20 transition-all"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={busy ? "The genie is thinking…" : "Make a wish… e.g. 'chill co-op puzzle for tonight'"}
          disabled={busy}
          className="flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="cta-glow text-white rounded-xl px-5 py-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity"
        >
          {busy ? "…" : "Wish"}
        </button>
      </form>
    </div>
  );
}

function RecCard({
  game,
  onFeedback,
  onMoreLikeThis,
}: {
  game: Game;
  onFeedback: (id: number, kind: "like" | "dislike") => void;
  onMoreLikeThis: () => void;
}) {
  const [voted, setVoted] = useState<"like" | "dislike" | null>(null);
  return (
    <div className="tilt-card bg-panel border border-border rounded-xl overflow-hidden flex flex-col">
      {game.header_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.header_image}
          alt={game.name}
          className="w-full aspect-[460/215] object-cover"
        />
      )}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <a
            href={`/games/${game.slug}`}
            className="font-semibold text-white no-underline hover:underline"
          >
            {game.name}
          </a>
          {game.tier && <TierBadge tier={game.tier} />}
        </div>
        {(game.developer || game.release_year) && (
          <div className="text-xs text-muted">
            {game.developer}
            {game.developer && game.release_year && " · "}
            {game.release_year}
          </div>
        )}
        {game.rationale && (
          <div className="text-sm text-accent">{game.rationale}</div>
        )}
        <div className="text-xs text-muted flex gap-2 flex-wrap">
          {game.tags.slice(0, 4).map(t => (
            <span key={t} className="border border-border rounded px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted flex justify-between items-center pt-2 mt-auto">
          <span>
            {game.price === 0 ? "Free" : `$${game.price.toFixed(2)}`} ·{" "}
            {(game.review_score * 100).toFixed(0)}% positive
          </span>
          <span className="flex gap-1">
            <button
              onClick={() => {
                setVoted("like");
                onFeedback(game.app_id, "like");
              }}
              disabled={voted !== null}
              className={`px-2 py-1 rounded ${voted === "like" ? "bg-accent/30" : "hover:bg-border"}`}
              title="I like this recommendation"
            >
              👍
            </button>
            <button
              onClick={() => {
                setVoted("dislike");
                onFeedback(game.app_id, "dislike");
              }}
              disabled={voted !== null}
              className={`px-2 py-1 rounded ${voted === "dislike" ? "bg-red-500/30" : "hover:bg-border"}`}
              title="Not for me"
            >
              👎
            </button>
          </span>
        </div>
        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            onClick={onMoreLikeThis}
            className="text-xs text-accent hover:underline"
          >
            More like this
          </button>
          <StoreLinks game={game} />
        </div>
      </div>
    </div>
  );
}

function StoreLinks({ game }: { game: Game }) {
  const urls = game.store_urls;
  // If store_urls not present (older cached data), fall back to steam_url only
  if (!urls) {
    return game.steam_url ? (
      <a
        href={game.steam_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="text-xs text-muted hover:text-white ml-auto"
      >
        Get game ↗
      </a>
    ) : null;
  }
  const stores: Array<{ key: keyof NonNullable<Game["store_urls"]>; label: string }> = [];
  if (urls.fanatical) stores.push({ key: "fanatical", label: "Fanatical" });
  if (urls.humble) stores.push({ key: "humble", label: "Humble" });
  if (urls.gmg) stores.push({ key: "gmg", label: "GMG" });
  stores.push({ key: "steam", label: "Steam" });
  return (
    <div className="flex flex-wrap gap-1 ml-auto">
      {stores.map(s => (
        <a
          key={s.key}
          href={urls[s.key]}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="text-[10px] uppercase tracking-wider bg-panel border border-border hover:border-gold hover:text-gold px-1.5 py-0.5 rounded no-underline text-muted transition-colors"
          title={`Buy on ${s.label}`}
        >
          {s.label} ↗
        </a>
      ))}
    </div>
  );
}

