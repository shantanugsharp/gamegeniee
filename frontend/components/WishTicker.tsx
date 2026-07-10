"use client";

import { useEffect, useState } from "react";

// Synthesized from popular query patterns — decorative flavor, not live data.
const WISHES = [
  "a cozy farming sim with romance options",
  "co-op horror to scream through with friends",
  "a roguelike deckbuilder under $15",
  "something like Hades but sci-fi",
  "a chill builder for one-more-turn nights",
  "story-rich walking sim, 3 hours max",
  "couch co-op for a date night",
  "a metroidvania with great music",
  "city builder that runs on a potato laptop",
  "an RPG where my choices actually matter",
  "atmospheric puzzle game like Inside",
  "split-screen racing like the old days",
];

/** Rotating "recent wish" line — crossfades through example wishes. */
export default function WishTicker() {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI(v => (v + 1) % WISHES.length);
        setVisible(true);
      }, 450);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8 flex items-center gap-2 text-sm text-muted justify-center lg:justify-start" aria-hidden="true">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
      </span>
      <span
        className={animate ? `transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}` : ""}
      >
        <span className="text-gold">✦</span> recent wish: <span className="text-white/80 italic">“{WISHES[i]}”</span>
      </span>
    </div>
  );
}
