import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About GameGenie",
  description:
    "GameGenie helps you find your next favorite game in a single sentence. Made for people who love games but hate wasting evenings on 'what should I play?'",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto relative pb-8">
      {/* Ambient orbs */}
      <div className="orb bg-accent w-[380px] h-[380px] -top-16 -left-24 opacity-25 animate-orb-drift pointer-events-none" />
      <div className="orb bg-gold w-[280px] h-[280px] top-4 -right-16 opacity-20 animate-orb-drift [animation-delay:-8s] pointer-events-none" />

      {/* ---------- Hero ---------- */}
      <div className="relative pt-4">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1 mb-6">
          <span className="animate-sparkle-spin inline-block">✦</span>
          meet the genie
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-[1.15] tracking-tight">
          Made for the moment{" "}
          <span
            className="inline-block bg-gradient-to-r from-accent via-[#a48bff] to-gold bg-clip-text text-transparent pb-2"
            style={{ WebkitTextFillColor: "transparent" }}
          >
            &quot;what should I play?&quot;
          </span>
          {" "}strikes.
        </h1>
        <p className="text-lg text-muted leading-relaxed">
          You have 90 minutes, a Steam library you&apos;ve never finished, and no idea what to
          click. GameGenie is the friend who&apos;s played everything and asks the right questions.
        </p>
      </div>

      {/* ---------- The story ---------- */}
      <section className="relative mt-16">
        <div className="text-xs uppercase tracking-widest text-gold mb-3">✦ origin story</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Born from a<span className="text-accent"> Steam sale</span>.
        </h2>
        <p className="text-muted leading-relaxed mb-4">
          It always ends the same way. Massive sale. Wishlist bloating. Fifteen browser tabs open.
          &quot;All Reviews: Overwhelmingly Positive&quot; on nine of them.
          Two hours later — still scrolling.
        </p>
        <p className="text-muted leading-relaxed">
          GameGenie was built for that exact moment. Skip the scroll. Say what you feel like playing.
          Get an honest, opinionated shortlist. Move on with your evening.
        </p>
      </section>

      {/* ---------- The three rules ---------- */}
      <section className="relative mt-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-gold mb-2">✦ the three rules of the genie</div>
          <h2 className="text-3xl font-bold text-white">
            Simple wishes. <span className="text-accent">Real answers.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: "1",
              title: "Every rec has a reason",
              body:
                "No card ever says just \"you'll love this.\" Every pick cites the actual tags and vibes that matched your ask. If we can't explain it, we don't show it.",
            },
            {
              n: "2",
              title: "The genie listens to \"no\"",
              body:
                "Say \"not horror\" and horror disappears. Say \"nothing like Dark Souls\" and difficulty stays away. Negation is a first-class citizen here.",
            },
            {
              n: "3",
              title: "Your taste, not the algorithm's",
              body:
                "Every thumbs-up teaches the genie what you love. No accounts, no tracking — just a small memory that quietly makes your next wish smarter.",
            },
          ].map(rule => (
            <div
              key={rule.n}
              className="tilt-card bg-panel border border-border rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
              <div className="text-gold font-bold text-3xl mb-3 relative">{rule.n}</div>
              <div className="text-white font-semibold mb-2 relative">{rule.title}</div>
              <div className="text-muted text-sm leading-relaxed relative">{rule.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- The promise ---------- */}
      <section className="relative mt-16">
        <div className="text-xs uppercase tracking-widest text-gold mb-3">✦ what you won&apos;t find here</div>
        <h2 className="text-3xl font-bold text-white mb-6">
          No <span className="text-accent">funny business.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              t: "No ads",
              b: "Nothing paid to rank higher. Publishers can&apos;t buy their way to the top.",
            },
            {
              t: "No sign-up",
              b: "No email, no password, no OAuth dance. Open a tab and go.",
            },
            {
              t: "No data selling",
              b: "Your thumbs live in your browser. We don&apos;t know who you are.",
            },
            {
              t: "No affiliate cuts",
              b: "Clicking through to buy a game doesn&apos;t send us a nickel.",
            },
          ].map(item => (
            <div
              key={item.t}
              className="bg-panel/70 backdrop-blur border border-border rounded-xl p-4 hover:border-gold/50 transition-colors"
            >
              <div className="text-white font-semibold mb-1">
                <span className="text-gold">✓ </span>
                {item.t}
              </div>
              <div
                className="text-muted text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.b }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Who's it for ---------- */}
      <section className="relative mt-16">
        <div className="text-xs uppercase tracking-widest text-gold mb-3">✦ who it&apos;s for</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Built for the <span className="text-accent">gamer with taste</span> and{" "}
          <span className="text-gold">no time</span>.
        </h2>
        <p className="text-muted leading-relaxed mb-3">
          If &quot;top rated&quot; charts leave you cold, if algorithm-picked feeds all start blurring together,
          if you already know exactly what mood you&apos;re in but nobody&apos;s asking — this is for you.
        </p>
        <p className="text-muted leading-relaxed">
          Whether it&apos;s a cozy Sunday, a co-op friday night, a rainy weekend with a big backlog,
          or the sudden urge for &quot;something like Hades but different&quot; — the genie has an answer.
        </p>
      </section>

      {/* ---------- Get in touch ---------- */}
      <section className="relative mt-16">
        <div className="text-xs uppercase tracking-widest text-gold mb-3">✦ hello?</div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Made by{" "}
          <span className="bg-gradient-to-r from-accent to-gold bg-clip-text text-transparent" style={{ WebkitTextFillColor: "transparent" }}>
            Shantanu Kesarkar
          </span>.
        </h2>
        <p className="text-muted leading-relaxed mb-4">
          Something broke? A game you love got missed? A rec was way off? Hit the{" "}
          <span className="text-white font-medium">&quot;Not what I asked?&quot;</span> button on any
          slate — the genie learns from every complaint.
        </p>
        <a
          href="mailto:kesarksrshantnau@gmail.com"
          className="inline-flex items-center gap-2 text-sm bg-panel border border-border rounded-lg px-4 py-2 no-underline hover:border-accent hover:bg-accent/10 transition-all"
        >
          <span className="text-gold">✉</span>
          <span className="text-white">kesarksrshantnau@gmail.com</span>
        </a>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mt-16 text-center relative">
        <div className="orb bg-accent w-[300px] h-[300px] top-0 left-1/2 -translate-x-1/2 opacity-25 pointer-events-none" />
        <div className="relative">
          <div className="text-4xl mb-4 inline-block animate-sparkle-spin">✦</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Ready to make a wish?
          </h2>
          <p className="text-muted mb-6">Three seconds. One sentence. Your next great evening.</p>
          <a
            href="/chat"
            className="cta-glow text-white rounded-xl px-8 py-4 font-semibold no-underline inline-flex items-center gap-2 shadow-lg shadow-accent/40 hover:shadow-accent/70 transition-shadow"
          >
            Enter the chat
            <span className="text-lg">→</span>
          </a>
        </div>
      </section>
    </article>
  );
}
