"use client";

const TWISTS = [
  "easier",
  "harder",
  "shorter",
  "longer",
  "cheaper",
  "cozier",
  "darker",
  "with co-op",
];

export default function TwistButtons({ gameName }: { gameName: string }) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-widest text-gold mb-2">
        ✦ games like this but...
      </div>
      <div className="flex flex-wrap gap-2">
        {TWISTS.map(t => (
          <a
            key={t}
            href={`/chat?q=${encodeURIComponent(`games like ${gameName} but ${t}`)}`}
            className="text-xs bg-panel/70 border border-border rounded-full px-3 py-1.5 no-underline hover:border-gold hover:bg-gold/10 text-muted hover:text-white transition-all"
          >
            {t}
          </a>
        ))}
      </div>
    </div>
  );
}
