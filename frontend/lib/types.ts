export type Tier = "aaa" | "indie" | "mid";

export type Game = {
  app_id: number;
  name: string;
  slug: string;
  short_description: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  is_multiplayer: boolean;
  price: number;
  review_score: number;
  positive_reviews?: number;
  tier?: Tier;
  developer?: string;
  release_year?: string;
  steam_url?: string;
  header_image: string;
  score: number;
  rationale?: string;
};

export type GameDetail = Game & {
  similar: Game[];
};

export type Intent = "recommend" | "chat" | "off_topic";

export type Slots = {
  intent?: Intent;
  search_text: string;
  genres?: string[];
  mood?: string | null;
  multiplayer?: boolean | null;
  singleplayer?: boolean | null;
  platform?: string | null;
  price_max?: number | null;
  tier?: string | null;
  avoid_tags?: string[];
  clarify?: string | null;
};

export type ChatResponse =
  | { type: "clarify"; message: string; slots: Slots; recommendations: [] }
  | { type: "chat"; message: string; slots: Slots; recommendations: [] }
  | { type: "recommendations"; message: string; slots: Slots; recommendations: Game[] };
