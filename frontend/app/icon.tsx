import { ImageResponse } from "next/og";

// Next.js App Router: this file becomes /icon (favicon).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "#0e0f13",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7c5cff",
          fontWeight: 700,
        }}
      >
        ✦
      </div>
    ),
    size,
  );
}
