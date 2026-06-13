import { prisma } from "@/lib/db";
import { faqPageJsonLd } from "@/lib/seo/jsonld";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — KOORAKIT",
  description: "Frequently asked questions about KOORAKIT, the global football festival streaming platform.",
};

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
  });

  const jsonLd = faqPageJsonLd(
    faqs.map((f) => ({ question: f.question, answer: f.answer })),
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="container mx-auto px-6 py-12 max-w-4xl" aria-labelledby="faq-heading">
        <h1 id="faq-heading" className="text-4xl font-bold text-foreground-strong mb-8">
          Frequently Asked Questions
        </h1>

        {faqs.length === 0 ? (
          <p className="text-foreground/60">No FAQs available yet.</p>
        ) : (
          <dl className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.id} className="glass rounded-xl border border-white/5 p-6">
                <dt className="text-lg font-semibold text-foreground-strong">{faq.question}</dt>
                <dd className="mt-2 text-foreground/70 leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}
