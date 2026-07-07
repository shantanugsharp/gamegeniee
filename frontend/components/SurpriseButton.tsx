"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { surpriseMe } from "@/lib/api";

export default function SurpriseButton({
  variant = "chip",
  filters,
}: {
  variant?: "chip" | "cta";
  filters?: Parameters<typeof surpriseMe>[0];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function fire() {
    if (loading) return;
    setLoading(true);
    // Safety: if navigation stalls (e.g. slow backend or bad response),
    // reset loading after 8s so the user can retry instead of staring at "Rolling..." forever.
    const safety = window.setTimeout(() => setLoading(false), 8000);
    try {
      const game = await surpriseMe(filters);
      router.push(`/games/${game.slug}`);
      // Reset shortly after so if the user hits back, button is fresh again.
      window.setTimeout(() => setLoading(false), 500);
    } catch {
      setLoading(false);
    } finally {
      window.clearTimeout(safety);
    }
  }

  if (variant === "cta") {
    return (
      <button
        onClick={fire}
        disabled={loading}
        aria-busy={loading}
        className="bg-panel border border-gold/40 hover:border-gold hover:bg-gold/10 text-white rounded-xl px-8 py-4 font-semibold no-underline inline-flex items-center justify-center gap-2 min-w-[180px] transition-all disabled:opacity-70 disabled:cursor-wait"
      >
        <span className={loading ? "animate-spin inline-block" : "inline-block"}>🎲</span>
        <span>{loading ? "Rolling…" : "Surprise me"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={fire}
      disabled={loading}
      aria-busy={loading}
      className="text-sm bg-panel/70 backdrop-blur border border-gold/30 rounded-full px-3 py-1.5 hover:border-gold hover:bg-gold/10 text-gold transition-all disabled:opacity-70 disabled:cursor-wait"
    >
      <span className={loading ? "animate-spin inline-block mr-1" : "inline-block mr-1"}>🎲</span>
      {loading ? "Rolling…" : "Surprise me"}
    </button>
  );
}
