"use client";

import { useState } from "react";
import { surpriseMe } from "@/lib/api";

export default function SurpriseButton({
  variant = "chip",
  filters,
}: {
  variant?: "chip" | "cta";
  filters?: Parameters<typeof surpriseMe>[0];
}) {
  const [loading, setLoading] = useState(false);

  async function fire() {
    if (loading) return;
    setLoading(true);
    try {
      const game = await surpriseMe(filters);
      window.location.href = `/games/${game.slug}`;
    } catch {
      setLoading(false);
    }
  }

  if (variant === "cta") {
    return (
      <button
        onClick={fire}
        disabled={loading}
        className="bg-panel border border-gold/40 hover:border-gold text-white rounded-xl px-6 py-3 font-medium no-underline flex items-center gap-2 transition-colors disabled:opacity-60"
      >
        <span className={loading ? "animate-spin inline-block" : "inline-block"}>🎲</span>
        {loading ? "Rolling..." : "Surprise me"}
      </button>
    );
  }

  return (
    <button
      onClick={fire}
      disabled={loading}
      className="text-xs bg-panel/70 backdrop-blur border border-gold/30 rounded-full px-3 py-1.5 hover:border-gold hover:bg-gold/10 text-gold transition-all disabled:opacity-60"
    >
      <span className={loading ? "animate-spin inline-block mr-1" : "inline-block mr-1"}>🎲</span>
      {loading ? "Rolling..." : "Surprise me"}
    </button>
  );
}
