// Centralized, whitespace-safe accessor for the public site URL.
// Guards against env vars pasted with trailing spaces / newlines / slashes.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
)
  .trim()
  .replace(/\/+$/, "");
