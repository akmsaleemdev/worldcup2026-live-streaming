import { describe, expect, it } from "vitest";
import { fc } from "../../test/fc";
import {
  SCHEMA_CONTEXT,
  organizationJsonLd,
  sportsEventJsonLd,
  articleJsonLd,
  faqPageJsonLd,
} from "./jsonld";

/**
 * Non-empty/non-whitespace string generator for required fields. The builders
 * `compact()` away empty/whitespace-only values, so required fields are only
 * guaranteed present when they carry meaningful content.
 */
const nonEmptyString = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

const organizationInputArb = fc.record(
  {
    name: nonEmptyString,
    url: nonEmptyString,
    logo: nonEmptyString,
    description: nonEmptyString,
    sameAs: fc.array(nonEmptyString, { maxLength: 4 }),
  },
  { requiredKeys: ["name", "url"] },
);

const sportsEventInputArb = fc.record(
  {
    name: nonEmptyString,
    startDate: nonEmptyString,
    endDate: nonEmptyString,
    location: nonEmptyString,
    homeTeam: fc.record({ name: nonEmptyString }),
    awayTeam: fc.record({ name: nonEmptyString }),
    url: nonEmptyString,
    description: nonEmptyString,
  },
  { requiredKeys: ["name", "startDate"] },
);

const articleInputArb = fc.record(
  {
    headline: nonEmptyString,
    datePublished: nonEmptyString,
    dateModified: nonEmptyString,
    author: nonEmptyString,
    description: nonEmptyString,
    url: nonEmptyString,
    isNewsArticle: fc.boolean(),
  },
  { requiredKeys: ["headline", "datePublished"] },
);

const faqInputArb = fc.array(
  fc.record({ question: nonEmptyString, answer: nonEmptyString }),
  { maxLength: 6 },
);

describe("structured-data builders (Property 9)", () => {
  // Feature: worldcup-2026-platform, Property 9: For any supported entity type (Organization, SportsEvent, Article, FAQPage), the JSON-LD builder produces an object with correct @context and @type and includes the entity's key fields.
  // _Validates: Requirements 8.4, 13.2, 13.3_
  it("emits correct @context/@type and key fields for every supported entity type", () => {
    fc.assert(
      fc.property(
        organizationInputArb,
        sportsEventInputArb,
        articleInputArb,
        faqInputArb,
        (orgInput, eventInput, articleInput, faqs) => {
          // --- Organization: @context, @type, key fields name + url ---
          const org = organizationJsonLd(orgInput);
          expect(org["@context"]).toBe(SCHEMA_CONTEXT);
          expect(org["@context"]).toBe("https://schema.org");
          expect(org["@type"]).toBe("Organization");
          expect(org.name).toBe(orgInput.name);
          expect(org.url).toBe(orgInput.url);

          // --- SportsEvent: @context, @type, key fields name + startDate ---
          const event = sportsEventJsonLd(eventInput);
          expect(event["@context"]).toBe("https://schema.org");
          expect(event["@type"]).toBe("SportsEvent");
          expect(event.name).toBe(eventInput.name);
          expect(event.startDate).toBe(eventInput.startDate);

          // --- Article / NewsArticle: @context, @type, key field headline ---
          const article = articleJsonLd(articleInput);
          expect(article["@context"]).toBe("https://schema.org");
          expect(article["@type"]).toBe(
            articleInput.isNewsArticle ? "NewsArticle" : "Article",
          );
          expect(["Article", "NewsArticle"]).toContain(article["@type"]);
          expect(article.headline).toBe(articleInput.headline);
          expect(article.datePublished).toBe(articleInput.datePublished);

          // --- FAQPage: @context, @type, and every question/answer present ---
          const faqPage = faqPageJsonLd(faqs);
          expect(faqPage["@context"]).toBe("https://schema.org");
          expect(faqPage["@type"]).toBe("FAQPage");
          expect(faqPage.mainEntity).toHaveLength(faqs.length);
          faqs.forEach((faq, index) => {
            const entity = faqPage.mainEntity[index];
            expect(entity["@type"]).toBe("Question");
            expect(entity.name).toBe(faq.question);
            expect(entity.acceptedAnswer["@type"]).toBe("Answer");
            expect(entity.acceptedAnswer.text).toBe(faq.answer);
          });
        },
      ),
    );
  });
});
