"use client";

import { useEffect, useRef } from "react";

type Game = {
  app_id: number | string;
  slug: string;
  name: string;
  header_image?: string | null;
};

// Physical dimensions of the 3D game case (px).
const W = 380; // width
const H = 234; // height (art + title bar)
const T = 14;  // half-thickness → total depth 28px

const SPARKLES = [
  { top: "6%", left: "12%", size: 14, delay: "0s" },
  { top: "18%", left: "82%", size: 10, delay: "-1.2s" },
  { top: "40%", left: "-4%", size: 8, delay: "-2.4s" },
  { top: "70%", left: "92%", size: 12, delay: "-0.6s" },
  { top: "88%", left: "20%", size: 9, delay: "-1.8s" },
  { top: "4%", left: "55%", size: 7, delay: "-3s" },
];

/**
 * Floating 3D game case hero — a thick CSS-3D box wrapped in real game art,
 * auto-swinging in space, tilting toward the pointer, hovering over glowing
 * genie rings, flanked by two satellite cards in depth.
 */
export default function Hero3D({ games }: { games: Game[] }) {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 26;
      ty = -(e.clientY / window.innerHeight - 0.5) * 16;
    };
    const tick = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      el.style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (games.length === 0) return null;
  const [main, ...rest] = games;

  const edgeFace: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    background: "linear-gradient(180deg, #2b2450, #171922)",
    boxShadow: "inset 0 0 12px rgba(124,92,255,0.5)",
  };

  return (
    <div className="relative h-[460px] hidden lg:block select-none" style={{ perspective: "1400px" }}>
      {/* Glowing floor rings */}
      <div className="hero3d-ring" style={{ animationDuration: "14s" }} />
      <div className="hero3d-ring hero3d-ring--dashed" style={{ animationDuration: "22s", animationDirection: "reverse" }} />
      {/* Ground glow */}
      <div
        className="absolute left-1/2 bottom-6 -translate-x-1/2 w-[420px] h-[90px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(124,92,255,0.4), rgba(245,196,85,0.12) 55%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* Sparkles floating around the scene */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="twinkle absolute pointer-events-none"
          style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}

      {/* Pointer-tilt layer */}
      <div ref={tiltRef} className="absolute inset-0 preserve-3d will-change-transform">
        {/* Satellite cards floating behind in depth */}
        {rest.slice(0, 2).map((g, i) => (
          <a
            key={g.app_id}
            href={`/games/${g.slug}`}
            className={`absolute block w-[210px] rounded-xl overflow-hidden border border-border/80 bg-panel
                        shadow-2xl no-underline opacity-80 hover:opacity-100 transition-opacity
                        ${i === 0 ? "animate-float" : "animate-float-slow"}`}
            style={{
              top: i === 0 ? "8%" : "58%",
              left: i === 0 ? "-6%" : "72%",
              transform: `translateZ(${i === 0 ? -140 : -200}px) rotateY(${i === 0 ? 14 : -12}deg)`,
              animationDelay: i === 0 ? "-2s" : "-5s",
            }}
          >
            {g.header_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.header_image} alt={g.name} className="w-full aspect-[460/215] object-cover" />
            )}
            <div className="px-2.5 py-1.5 text-[11px] text-muted truncate">{g.name}</div>
          </a>
        ))}

        {/* Auto-swing → bob → 3D box */}
        <div className="absolute inset-0 preserve-3d hero3d-swing">
          <div className="absolute inset-0 preserve-3d hero3d-bob">
            <div
              className="absolute top-1/2 left-1/2 preserve-3d"
              style={{ width: W, height: H, margin: `${-H / 2}px 0 0 ${-W / 2}px` }}
            >
              {/* FRONT — cover art + title */}
              <a
                href={`/games/${main.slug}`}
                className="absolute inset-0 rounded-2xl overflow-hidden no-underline flex flex-col
                           border border-accent/40 bg-panel"
                style={{
                  transform: `translateZ(${T}px)`,
                  boxShadow: "0 40px 80px -30px rgba(124,92,255,0.55), 0 0 40px rgba(124,92,255,0.15)",
                  backfaceVisibility: "hidden",
                }}
              >
                {main.header_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={main.header_image} alt={main.name} className="w-full aspect-[460/215] object-cover" />
                )}
                <div className="flex-1 flex items-center justify-between px-4 bg-gradient-to-r from-panel to-[#1d1a2e]">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{main.name}</div>
                    <div className="text-[10px] text-gold uppercase tracking-[0.2em]">✦ top pick</div>
                  </div>
                  <span className="text-accent text-lg shrink-0">→</span>
                </div>
                {/* Gloss sweep */}
                <div className="hero3d-gloss absolute inset-0 pointer-events-none" />
              </a>

              {/* BACK — genie sigil */}
              <div
                className="absolute inset-0 rounded-2xl border border-accent/30 bg-[#131022]
                           flex flex-col items-center justify-center gap-2 overflow-hidden"
                style={{ transform: `rotateY(180deg) translateZ(${T}px)`, backfaceVisibility: "hidden" }}
              >
                <div className="absolute inset-0 hero-grid opacity-40" />
                <span className="text-4xl text-accent animate-sparkle-spin relative">✦</span>
                <span className="text-white font-bold tracking-wide relative">GameGenie</span>
                <span className="text-[10px] text-muted uppercase tracking-[0.25em] relative">wish · granted</span>
              </div>

              {/* EDGES — give the case real thickness */}
              <div style={{ ...edgeFace, width: T * 2, height: H, transform: `translate(-50%,-50%) rotateY(90deg) translateZ(${W / 2}px)` }} />
              <div style={{ ...edgeFace, width: T * 2, height: H, transform: `translate(-50%,-50%) rotateY(-90deg) translateZ(${W / 2}px)` }} />
              <div style={{ ...edgeFace, width: W, height: T * 2, transform: `translate(-50%,-50%) rotateX(90deg) translateZ(${H / 2}px)` }} />
              <div style={{ ...edgeFace, width: W, height: T * 2, transform: `translate(-50%,-50%) rotateX(-90deg) translateZ(${H / 2}px)` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
