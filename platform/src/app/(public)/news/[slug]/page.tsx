import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { relatedArticles, RelatableArticle } from "@/lib/content/related";
import { articleJsonLd } from "@/lib/seo/jsonld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, metaTitle: true, metaDesc: true, imageUrl: true },
  });
  if (!article) return {};
  return {
    title: article.metaTitle || `${article.title} — KOORAKIT`,
    description: article.metaDesc || article.excerpt || "",
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDesc || article.excerpt || "",
      images: article.imageUrl ? [article.imageUrl] : [],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, published: true },
    include: { categories: true, tags: true },
  });

  if (!article) notFound();

  // Related articles (Req 11.5)
  const allArticles = await prisma.article.findMany({
    where: { published: true },
    include: { categories: true, tags: true },
  });

  const corpus: RelatableArticle[] = allArticles.map((a) => ({
    id: a.id,
    categories: a.categories.map((c) => c.slug),
    tags: a.tags.map((t) => t.slug),
  }));

  const source: RelatableArticle = {
    id: article.id,
    categories: article.categories.map((c) => c.slug),
    tags: article.tags.map((t) => t.slug),
  };

  const relatedIds = relatedArticles(source, corpus, 3).map((r) => r.id);
  const related = allArticles.filter((a) => relatedIds.includes(a.id));

  const jsonLd = articleJsonLd({
    headline: article.title,
    description: article.excerpt || "",
    url: `${process.env.NEXTAUTH_URL || "https://koorakit.com"}/news/${article.slug}`,
    image: article.imageUrl || undefined,
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/news" className="inline-flex items-center gap-2 text-sm text-link hover:text-accent transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {article.categories.map((cat) => (
              <span key={cat.id} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                {cat.name}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground-strong leading-tight">{article.title}</h1>
          <time className="text-sm text-foreground/50 mt-3 block">
            {new Date(article.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </time>
        </header>

        {article.imageUrl && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8 bg-surface relative">
            <Image src={article.imageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
          </div>
        )}

        <div
          className="prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Social sharing (Req 11.6) */}
        <div className="flex items-center gap-4 mt-10 pt-6 border-t border-white/10">
          <Share2 className="w-5 h-5 text-foreground/60" />
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://koorakit.com/news/${article.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-link hover:text-accent transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://koorakit.com/news/${article.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-link hover:text-accent transition-colors"
          >
            Share on Facebook
          </a>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {article.tags.map((tag) => (
              <span key={tag.id} className="text-xs px-2 py-1 rounded bg-surface border border-white/10 text-foreground/60">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Related articles (Req 11.5) */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-foreground-strong mb-4">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/news/${r.slug}`}
                  className="block rounded-lg border border-white/10 bg-surface p-4 hover:border-accent/40 transition-colors"
                >
                  <h3 className="font-semibold text-foreground-strong text-sm">{r.title}</h3>
                  <time className="text-xs text-foreground/40 mt-2 block">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </time>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
