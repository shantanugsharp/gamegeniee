"use client";

import { useEffect, useRef } from "react";

type P = {
  x: number; y: number;
  vy: number; sway: number; phase: number;
  r: number; hue: string; tw: number;
};

const COLORS = ["124,92,255", "245,196,85", "255,255,255"];

/**
 * Magic-dust particle canvas: soft glowing motes drifting upward with a
 * gentle sway and twinkle. Absolutely fills its parent; pointer-events none.
 */
export default function ParticleField({ density = 60 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: P[] = [];

    const spawn = (randomY: boolean): P => ({
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10,
      vy: 0.15 + Math.random() * 0.35,
      sway: 8 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      r: 0.6 + Math.random() * 1.7,
      hue: COLORS[(Math.random() * COLORS.length) | 0],
      tw: 0.5 + Math.random() * 1.5,
    });

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: density }, () => spawn(true));
    };

    let t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy;
        const x = p.x + Math.sin(t * p.tw + p.phase) * p.sway;
        if (p.y < -10) particles[i] = spawn(false);
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * p.tw * 2 + p.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.hue},${alpha.toFixed(3)})`;
        ctx.shadowColor = `rgba(${p.hue},0.9)`;
        ctx.shadowBlur = p.r * 4;
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
