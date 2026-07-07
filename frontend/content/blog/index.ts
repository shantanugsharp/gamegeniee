// Simple hand-written blog. Each post is a data file with title, date, excerpt, body (HTML string).
// No CMS, no MDX pipeline — plain TypeScript so anyone editing the repo can add posts.

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;              // YYYY-MM-DD
  readMinutes: number;
  tags: string[];
  body: string;              // HTML string; use <p>, <h2>, <ul>, <a>, etc.
};

import { rogueDeckbuildersPost } from "./best-roguelike-deckbuilders-2026";
import { cozyGamesUnder10Post } from "./cozy-games-under-10";
import { howGameGenieWorksPost } from "./how-gamegenie-works";

export const posts: BlogPost[] = [
  rogueDeckbuildersPost,
  cozyGamesUnder10Post,
  howGameGenieWorksPost,
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}

export function allSlugs(): string[] {
  return posts.map(p => p.slug);
}
