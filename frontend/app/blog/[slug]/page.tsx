import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, allSlugs } from "@/content/blog";

export const revalidate = 86400;

export async function generateStaticParams() {
  return allSlugs().map(slug => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Person", name: "Shantanu Kesarkar" },
    keywords: post.tags.join(", "),
  };

  return (
    <article className="max-w-3xl mx-auto pb-8 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="orb bg-accent w-[300px] h-[300px] -top-12 -left-24 opacity-20 pointer-events-none" />
      <div className="orb bg-gold w-[220px] h-[220px] top-4 -right-12 opacity-15 pointer-events-none" />

      <nav aria-label="Breadcrumb" className="text-xs text-muted relative mb-4">
        <a href="/" className="hover:text-white">Home</a>
        {" › "}
        <a href="/blog" className="hover:text-white">Blog</a>
        {" › "}
        <span className="text-white">{post.title}</span>
      </nav>

      <div className="relative">
        <div className="text-xs uppercase tracking-widest text-gold mb-3">
          {post.tags.join(" · ")}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="text-sm text-muted mb-8">
          {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {" · "}
          {post.readMinutes} min read
        </div>

        <div
          className="prose prose-invert max-w-none
                     text-white/85
                     [&>p]:leading-relaxed [&>p]:mb-4
                     [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-8 [&>h2]:mb-3
                     [&>hr]:my-8 [&>hr]:border-border
                     [&_a]:text-accent [&_a]:hover:underline
                     [&_pre]:bg-panel [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto
                     [&_code]:text-gold [&_code]:font-mono [&_code]:text-sm
                     [&_ul]:list-disc [&_ul]:ml-6 [&_ul>li]:mb-1"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        <div className="mt-12 pt-8 border-t border-border text-center">
          <a
            href="/chat"
            className="cta-glow text-white rounded-xl px-6 py-3 font-semibold no-underline inline-flex items-center gap-2 shadow-lg shadow-accent/40"
          >
            Make a wish <span>→</span>
          </a>
        </div>
      </div>
    </article>
  );
}
