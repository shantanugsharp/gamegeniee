import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0c11",
        panel: "#171922",
        border: "#252836",
        accent: "#7c5cff",       // purple
        gold: "#f5c455",         // warm secondary (genie treasure)
        muted: "#8a8fa3",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 20% 30%, rgba(124,92,255,0.25), transparent 50%), radial-gradient(circle at 80% 70%, rgba(245,196,85,0.15), transparent 50%)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%":     { transform: "translateY(-14px) rotate(0.5deg)" },
        },
        "float-slow": {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%":     { transform: "translateY(-8px) rotate(-0.4deg)" },
        },
        "orb-drift": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%":     { transform: "translate(40px,-30px) scale(1.1)" },
          "66%":     { transform: "translate(-30px,20px) scale(0.95)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 24px rgba(124,92,255,0.35)" },
          "50%":     { boxShadow: "0 0 48px rgba(124,92,255,0.7)" },
        },
        "sparkle-spin": {
          "0%":   { transform: "rotate(0deg) scale(1)" },
          "50%":  { transform: "rotate(180deg) scale(1.15)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
      },
      animation: {
        float:        "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        "orb-drift":  "orb-drift 20s ease-in-out infinite",
        shimmer:      "shimmer 6s linear infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "sparkle-spin": "sparkle-spin 8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
