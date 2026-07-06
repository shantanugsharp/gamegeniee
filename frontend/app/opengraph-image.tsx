import { ImageResponse } from "next/og";

export const alt = "GameGenie — your wish, our recommendation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Runs at build/ISR time. Rendered once per unique route this file lives under.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #0e0f13 0%, #1a1730 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "#a48bff", letterSpacing: 3 }}>✦  GAMEGENIE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Make a wish.
          </div>
          <div style={{ fontSize: 100, fontWeight: 700, color: "#7c5cff", lineHeight: 1.05, letterSpacing: -2 }}>
            Get the game.
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#8a8fa3" }}>
          AI recommender · 56,000+ games · free · no sign-up
        </div>
      </div>
    ),
    size,
  );
}
