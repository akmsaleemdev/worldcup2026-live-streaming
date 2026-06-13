import { describe, expect, it } from "vitest";
import { fc } from "../../test/fc";
import { buildMetadata, type SeoEntityType } from "./metadata";

/** The four indexable entity kinds the metadata builder supports. */
const entityTypeArb: fc.Arbitrary<SeoEntityType> = fc.constantFrom(
  "page",
  "article",
  "match",
  "team",
);

/** Arbitrary inputs covering empty/defaulted as well as populated fields. */
const inputArb = fc.record(
  {
    path: fc.webPath(),
    type: entityTypeArb,
    title: fc.string(),
    description: fc.string(),
  },
  { requiredKeys: [] },
);

describe("page metadata completeness (Property 8)", () => {
  // Feature: worldcup-2026-platform, Property 8: For any indexable entity, generated metadata contains non-empty title, description, OpenGraph, and Twitter fields and a canonical URL that is an absolute HTTPS URL.
  // _Validates: Requirements 8.1, 20.3_
  it("always produces non-empty title/description, OpenGraph + Twitter blocks, and an absolute HTTPS canonical URL", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        // Pass an explicit baseUrl so the test stays deterministic and does not
        // depend on the NEXT_PUBLIC_SITE_URL environment variable.
        const metadata = buildMetadata({ ...input, baseUrl: "example.com" });

        // Non-empty title.
        expect(typeof metadata.title).toBe("string");
        expect((metadata.title as string).trim()).not.toBe("");

        // Non-empty description.
        expect(typeof metadata.description).toBe("string");
        expect((metadata.description as string).trim()).not.toBe("");

        // Canonical URL present, absolute, HTTPS, and a valid URL.
        const canonical = metadata.alternates?.canonical;
        expect(typeof canonical).toBe("string");
        const canonicalUrl = canonical as string;
        expect(canonicalUrl.startsWith("https://")).toBe(true);
        expect(() => new URL(canonicalUrl)).not.toThrow();
        expect(new URL(canonicalUrl).protocol).toBe("https:");

        // OpenGraph block present with non-empty title/description, matching
        // absolute HTTPS url, and at least one image.
        const og = metadata.openGraph;
        expect(og).toBeDefined();
        expect(typeof og!.title).toBe("string");
        expect((og!.title as string).trim()).not.toBe("");
        expect(typeof og!.description).toBe("string");
        expect((og!.description as string).trim()).not.toBe("");
        expect((og as { url?: string }).url).toBe(canonicalUrl);
        const ogImages = (og as { images?: unknown[] }).images;
        expect(Array.isArray(ogImages)).toBe(true);
        expect(ogImages!.length).toBeGreaterThan(0);

        // Twitter block present with non-empty title/description and a card.
        const twitter = metadata.twitter;
        expect(twitter).toBeDefined();
        expect(typeof twitter!.title).toBe("string");
        expect((twitter!.title as string).trim()).not.toBe("");
        expect(typeof twitter!.description).toBe("string");
        expect((twitter!.description as string).trim()).not.toBe("");
        const twitterImages = (twitter as { images?: unknown[] }).images;
        expect(Array.isArray(twitterImages)).toBe(true);
        expect(twitterImages!.length).toBeGreaterThan(0);
      }),
    );
  });
});
