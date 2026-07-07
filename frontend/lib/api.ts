import type { ChatResponse, GameDetail, Game } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/** Server-side (RSC) fetch — uses the backend directly. */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    // ISR: revalidate cached responses periodically
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function getGameDetail(slug: string): Promise<GameDetail | null> {
  try {
    return await serverFetch<GameDetail>(`/games/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export type GameSummary = {
  app_id: number;
  slug: string;
  name: string;
  short_description?: string;
  header_image?: string;
  tier?: string;
  review_score?: number;
  positive_reviews?: number;
};

export async function listGames(limit = 100, offset = 0): Promise<{ total: number; games: GameSummary[] }> {
  return serverFetch(`/games?limit=${limit}&offset=${offset}`);
}

/** Client-side chat + feedback — called from browser. */
export async function clientChat(payload: {
  user_id: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  recent_games?: { name: string; genres: string[]; tags: string[]; is_multiplayer: boolean }[];
  top_n?: number;
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  return res.json();
}

export async function clientFeedback(payload: {
  user_id: string;
  app_id: number;
  kind: "like" | "dislike";
}): Promise<void> {
  await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function clientQueryFeedback(payload: {
  user_id: string;
  query: string;
  note?: string;
}): Promise<void> {
  await fetch(`${API_BASE}/feedback/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listGenres(): Promise<{ genres: { slug: string; count: number }[] }> {
  return serverFetch("/genres");
}

export async function surpriseMe(filters?: {
  genre?: string;
  tier?: string;
  price_max?: number;
  multiplayer?: boolean;
}): Promise<Game> {
  const params = new URLSearchParams();
  if (filters?.genre) params.set("genre", filters.genre);
  if (filters?.tier) params.set("tier", filters.tier);
  if (filters?.price_max != null) params.set("price_max", String(filters.price_max));
  if (filters?.multiplayer != null) params.set("multiplayer", String(filters.multiplayer));
  const q = params.toString();
  const res = await fetch(`${API_BASE}/surprise${q ? "?" + q : ""}`);
  if (!res.ok) throw new Error(`surprise ${res.status}`);
  return res.json();
}

export async function explainGame(slug: string, userId: string) {
  return serverFetch<{ game: Game; pitch: string }>(
    `/games/${encodeURIComponent(slug)}/explain?user_id=${encodeURIComponent(userId)}`
  );
}

export async function explainGenre(genre: string) {
  return serverFetch<{ genre: string; explanation: string; examples: Game[] }>(
    `/genres/${encodeURIComponent(genre)}/explain`
  );
}

export async function tasteSummary(userId: string) {
  const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}/taste-summary`);
  if (!res.ok) throw new Error(`taste ${res.status}`);
  return res.json() as Promise<{ count: number; summary: string; liked: Game[] }>;
}

export async function listGamesByGenre(genre: string, limit = 60, offset = 0) {
  return serverFetch<{
    total: number;
    genre: string;
    games: {
      app_id: number;
      slug: string;
      name: string;
      short_description: string;
      header_image: string;
      tier: string;
      review_score: number;
      positive_reviews: number;
    }[];
  }>(`/games?genre=${encodeURIComponent(genre)}&limit=${limit}&offset=${offset}`);
}
