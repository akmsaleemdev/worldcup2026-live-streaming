import { describe, it, expect } from "vitest";
import { fc } from "@/test/fc";
import { relatedArticles, RelatableArticle } from "./related";

// Feature: worldcup-2026-platform, Property 11: For any article and corpus, every related article shares at least one category or tag with the source and is never the source article itself.

const arbArticle = fc.record({
  id: fc.uuid(),
  categories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    minLength: 0,
    maxLength: 5,
  }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    minLength: 0,
    maxLength: 5,
  }),
});

describe("relatedArticles — Property 11: shared category/tag and excludes self", () => {
  it("every related article shares at least one category or tag with the source", () => {
    fc.assert(
      fc.property(arbArticle, fc.array(arbArticle, { maxLength: 20 }), (source, corpus) => {
        const related = relatedArticles(source, corpus);
        const sourceLabels = new Set([...source.categories, ...source.tags]);

        for (const article of related) {
          const candidateLabels = [...article.categories, ...article.tags];
          const hasShared = candidateLabels.some((l) => sourceLabels.has(l));
          expect(hasShared).toBe(true);
        }
      }),
    );
  });

  it("never includes the source article itself", () => {
    fc.assert(
      fc.property(arbArticle, fc.array(arbArticle, { maxLength: 20 }), (source, corpus) => {
        // Add source to corpus to test exclusion
        const corpusWithSource = [...corpus, source];
        const related = relatedArticles(source, corpusWithSource);

        for (const article of related) {
          expect(article.id).not.toBe(source.id);
        }
      }),
    );
  });
});
