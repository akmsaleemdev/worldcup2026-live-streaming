import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News — KOORAKIT",
  description: "Latest football news, match reports, and tournament coverage from KOORAKIT.",
};

export default async function NewsPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { categories: true, tags: true },
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <Newspaper className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-bold text-foreground-strong">News</h1>
        </div>

        {articles.length === 0 ? (
          <p className="text-foreground/60">No articles published yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="group block rounded-xl border border-white/10 bg-surface p-5 hover:border-accent/40 transition-colors"
              >
                {article.imageUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-background relative">
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {article.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-semibold text-foreground-strong group-hover:text-accent transition-colors">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="text-sm text-foreground/60 mt-2 line-clamp-2">{article.excerpt}</p>
                )}
                <time className="text-xs text-foreground/40 mt-3 block">
                  {new Date(article.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
