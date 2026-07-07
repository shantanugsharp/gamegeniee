import type { BlogPost } from "./index";

export const howGameGenieWorksPost: BlogPost = {
  slug: "how-gamegenie-works",
  title: "How GameGenie Actually Works (a Deep Dive)",
  excerpt:
    "Not magic. Six stages: understand → filter → retrieve → rerank → diversify → explain. Here's what's under the hood.",
  date: "2026-07-05",
  readMinutes: 8,
  tags: ["engineering", "recsys", "meta"],
  body: `
<p>People keep asking how GameGenie can turn "chill co-op puzzle for tonight" into three actually-good picks. The short answer: it's not one model, it's six stages working together. Here's each one.</p>

<h2>1. Understanding your sentence</h2>

<p>The first job is turning your free-form English into structured filters. A large language model — currently Llama 3.3 70B — reads your query and produces JSON like this:</p>

<pre><code>{
  "search_text": "relaxing cooperative puzzle games",
  "genres": ["puzzle"],
  "mood": "relaxing",
  "multiplayer": true,
  "singleplayer": false,
  "session_length": "short"
}</code></pre>

<p>Two things are subtle here. First: negation. If you say "action game but nothing like Dark Souls," we route "action game" to search and "Dark Souls" to an <em>avoid_tags</em> field. Embeddings ignore the word "not," so if we just fed them "action game not Dark Souls," they'd happily return souls-likes. Separating the wants and don't-wants is what makes negation actually work.</p>

<p>Second: intent classification. The same call decides whether you're asking for a game or asking a question ("what's a roguelike?") or going off-topic ("what's the weather?"). Each intent goes down a different path.</p>

<h2>2. Hard filters</h2>

<p>Structured filters run first, before any expensive machine learning. Co-op only? Drop every single-player game. Under $20? Drop everything more expensive. Not roguelikes? Drop roguelikes. These are boolean set operations across 56,000 games — measured in microseconds.</p>

<h2>3. Hybrid retrieval: BM25 + dense vectors</h2>

<p>Now the interesting part. We run two different searches in parallel:</p>

<p><strong>BM25</strong> is old-school keyword search — the same math that powered Yahoo before Google. It scores games by how often your query words appear in their descriptions, weighted by how rare those words are. BM25 wins on precise queries. Type "stardew" and you get Stardew Valley immediately.</p>

<p><strong>Dense embeddings</strong> convert your query and every game into 384-dimensional vectors using a sentence transformer model. Similar meanings become geometrically close. Type "cozy farming" and games tagged "relaxing agriculture sim" surface — even though the words don't overlap.</p>

<p>Neither dominates. BM25 is precise but literal; dense retrieval is fuzzy but semantic. We combine them using Reciprocal Rank Fusion: for each candidate that shows up in either list, we sum <code>1 / (60 + rank)</code>. Games ranked highly by either signal float up. This is what modern search stacks (including Google) actually do.</p>

<h2>4. Cross-encoder reranking</h2>

<p>The fused list of ~50 candidates is still noisy. So we rerank with a smaller, slower model that scores true relevance for each (query, game description) pair. Cross-encoders are more accurate than embedding similarity but too slow to run over 56,000 games; over 50 they're fast. This is the "cheap recall, expensive precision" two-stage pattern.</p>

<h2>5. Maximum Marginal Relevance (diversification)</h2>

<p>Top rerank scores tend to produce near-duplicates. If you ask for a roguelike deckbuilder, five different Slay the Spire clones might all score similarly. That's a bad slate.</p>

<p>MMR fixes this: for each next pick, we take <code>relevance − 0.3 × max_similarity_to_already_chosen</code>. It nudges the selection toward variety. You get Slay the Spire + Cobalt Core + Wildfrost instead of five clones.</p>

<h2>6. Rationale generation</h2>

<p>Finally, the LLM writes a one-line explanation for each pick — grounded strictly on the actual tags and genres. "Matches your search: Story Rich and RPG tags" — not "you'll love this!" Every rationale cites specific metadata. If we can't ground the claim, we don't make it.</p>

<h2>Bonus: personalization</h2>

<p>Every thumbs-up updates a small preference vector in your browser — the mean of games you liked minus a fraction of games you disliked. On your next query, that vector gets blended into your query embedding. Recommendations quietly shift toward your taste over time.</p>

<h2>What we don't do</h2>

<ul>
  <li>No accounts</li>
  <li>No cross-user tracking</li>
  <li>No storing your chat on our servers</li>
  <li>No paid rankings</li>
  <li>No affiliate cuts (for now)</li>
</ul>

<hr />

<p>Curious about any specific stage? <a href="mailto:kesarksrshantnau@gmail.com">Email me</a>.</p>
`,
};
