import { describe, it, expect } from "vitest";
import { fc } from "@/test/fc";
import { slugify } from "./slug";

// Feature: worldcup-2026-platform, Property 10: For any article title, the generated slug matches ^[a-z0-9]+(?:-[a-z0-9]+)*$, and slugify applied to an already-generated slug returns the same slug.

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("slugify — Property 10: URL-safe and idempotent", () => {
  it("produces a URL-safe slug matching the regex (when input has alphanumeric content)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /[a-zA-Z0-9]/.test(s)),
        (title) => {
          const slug = slugify(title);
          expect(slug).toMatch(SLUG_REGEX);
        },
      ),
    );
  });

  it("is idempotent: slugify(slugify(x)) === slugify(x)", () => {
    fc.assert(
      fc.property(fc.string(), (title) => {
        const once = slugify(title);
        const twice = slugify(once);
        expect(twice).toBe(once);
      }),
    );
  });

  it("returns empty string for inputs with no alphanumeric content", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/[a-zA-Z0-9]/.test(s)),
        (title) => {
          expect(slugify(title)).toBe("");
        },
      ),
    );
  });
});
