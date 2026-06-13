import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

/**
 * Edge-case unit tests for slug generation (Req 11.4, task 12.6).
 */
describe("slugify — edge cases", () => {
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles whitespace-only", () => {
    expect(slugify("   ")).toBe("");
  });

  it("handles pure punctuation/symbols", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });

  it("handles accented characters (diacritics)", () => {
    expect(slugify("São Paulo vs München")).toBe("sao-paulo-vs-munchen");
  });

  it("collapses multiple spaces and hyphens", () => {
    expect(slugify("hello   ---   world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello");
  });

  it("handles numeric titles", () => {
    expect(slugify("2026 World Cup Final")).toBe("2026-world-cup-final");
  });

  it("is idempotent on already-slugified input", () => {
    const slug = "already-a-slug";
    expect(slugify(slug)).toBe(slug);
  });

  it("deduplicates suffix scenario — slugify itself is pure, no collision logic", () => {
    // The deduplication is in the server action (resolveUniqueSlug), not slugify
    expect(slugify("My Great Article")).toBe("my-great-article");
    expect(slugify("My Great Article")).toBe("my-great-article");
  });
});
