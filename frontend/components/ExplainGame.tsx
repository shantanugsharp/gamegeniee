"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function ExplainGame({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string>("anon");

  useEffect(() => {
    setUid(localStorage.getItem("uid") || "anon");
  }, []);

  async function load() {
    if (pitch || loading) return;
    setLoading(true);
    try {
      const r = await fetch(
        `${API_BASE}/games/${encodeURIComponent(slug)}/explain?user_id=${encodeURIComponent(uid)}`
      );
      const d = await r.json();
      setPitch(d.pitch || "Couldn't generate a pitch right now.");
    } catch {
      setPitch("Couldn't reach the genie right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => {
          setOpen(o => !o);
          if (!open) load();
        }}
        className="text-sm bg-panel/70 border border-accent/40 hover:border-accent hover:bg-accent/10 rounded-lg px-4 py-2 no-underline transition-all"
      >
        {open ? "Hide the genie's take ✦" : "✦ Explain this to me"}
      </button>

      {open && (
        <div className="mt-3 bg-panel border border-accent/30 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative text-sm text-white/90 leading-relaxed whitespace-pre-line">
            {loading ? (
              <span className="text-muted italic">The genie is thinking…</span>
            ) : (
              pitch
            )}
          </div>
        </div>
      )}
    </div>
  );
}
