"use server";

/**
 * Article (Content_Editor) Server Actions (Req 11.1–11.4, 6.3, 6.4, 6.5).
 *
 * CRUD for `Article`, the backing store for the public News section. Every
 * action follows the shared CMS contract:
 *   1. `authorizeAction(...)` re-checks the session/role server-side (defense
 *      in depth, Req 6.4) — `content:write` for create/update, `content:delete`
 *      for delete.
 *   2. Inputs are validated, the unique slug is resolved, then the Prisma write
 *      runs (Req 6.3).
 *   3. Exactly one audit entry is recorded via `recordAudit` (Req 6.5).
 *
 * Categories are constrained to the six fixed editorial categories (Req 11.2)
 * and connected to the relational `Category` table via `connectOrCreate` keyed
 * by the canonical slug; tags (Req 11.3) are likewise `connectOrCreate`d from
 * free-text names. Slugs are generated with the shared `slugify` helper and
 * deduplicated with a numeric suffix on collision (Req 11.4). Affected admin
 * and public paths are revalidated after each mutation.
 */
import { revalidatePath } from "next/cache";

import {
  authorizeAction,
  coerceBoolean,
  optionalString,
  requireString,
  ValidationError,
} from "@/lib/cms/action-helpers";
import { recordAudit } from "@/lib/cms/audit";
import {
  ARTICLE_CATEGORY_SLUGS,
  categoryBySlug,
} from "@/lib/content/categories";
import { slugify } from "@/lib/content/slug";
import { prisma } from "@/lib/db";

/** Audit `entity` label for article mutations. */
const ENTITY = "Article";

/** Fallback slug when a title yields no alphanumeric content (Req 11.4). */
const FALLBACK_SLUG = "article";

/** Create/update input for an article. */
export interface ArticleInput {
  title: string;
  content: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  published?: boolean;
  /** SEO metadata (Req 11.3). */
  metaTitle?: string | null;
  metaDesc?: string | null;
  keywords?: string | null;
  /** Category slugs drawn from the six fixed categories (Req 11.2). */
  categorySlugs?: string[];
  /** Free-text tag names (Req 11.3). */
  tags?: string[];
}

/** Revalidate admin and public surfaces that depend on article data. */
function revalidateArticlePaths(slug: string): void {
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${slug}`);
}

/**
 * Resolve a unique, URL-safe slug for `title`, deduplicating with a numeric
 * suffix on collision (Req 11.4). When updating, `excludeId` omits the article
 * being edited so it never collides with itself.
 */
async function resolveUniqueSlug(
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title) || FALLBACK_SLUG;

  // Pull every slug that could collide with `base` or `base-<n>`; the exact
  // membership checks below make the broader `startsWith` filter safe.
  const existing = await prisma.article.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });
  const taken = new Set(existing.map((a) => a.slug));

  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

/** Validate and normalize the requested category slugs against the fixed set. */
function parseCategorySlugs(slugs: string[] | undefined): string[] {
  if (slugs === undefined) {
    return [];
  }
  if (!Array.isArray(slugs)) {
    throw new ValidationError("\"categories\" must be a list.", "categories");
  }
  const unique = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)));
  for (const slug of unique) {
    if (!ARTICLE_CATEGORY_SLUGS.includes(slug)) {
      throw new ValidationError(
        `Unknown category "${slug}".`,
        "categories",
      );
    }
  }
  return unique;
}

/** A normalized tag: its display name and canonical slug. */
interface ParsedTag {
  name: string;
  slug: string;
}

/** Validate and normalize free-text tag names into unique name/slug pairs. */
function parseTags(tags: string[] | undefined): ParsedTag[] {
  if (tags === undefined) {
    return [];
  }
  if (!Array.isArray(tags)) {
    throw new ValidationError("\"tags\" must be a list.", "tags");
  }
  const seen = new Set<string>();
  const parsed: ParsedTag[] = [];
  for (const raw of tags) {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (name.length === 0) {
      continue;
    }
    const slug = slugify(name);
    if (slug.length === 0 || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    parsed.push({ name, slug });
  }
  return parsed;
}

/**
 * `connectOrCreate` clause for the fixed categories, keyed by canonical slug so
 * the backing `Category` rows are created on first use (Req 11.2).
 */
function categoryConnectOrCreate(slugs: string[]) {
  return slugs.map((slug) => {
    const def = categoryBySlug(slug);
    return {
      where: { slug },
      create: { slug, name: def?.label ?? slug },
    };
  });
}

/** `connectOrCreate` clause for tags, keyed by canonical slug (Req 11.3). */
function tagConnectOrCreate(tags: ParsedTag[]) {
  return tags.map((tag) => ({
    where: { slug: tag.slug },
    create: { slug: tag.slug, name: tag.name },
  }));
}

/** Validate raw input into the scalar column data for an article write. */
function parseArticleScalars(input: ArticleInput) {
  return {
    title: requireString(input.title, "title"),
    content: requireString(input.content, "content"),
    excerpt: optionalString(input.excerpt, "excerpt"),
    imageUrl: optionalString(input.imageUrl, "imageUrl"),
    published: coerceBoolean(input.published, false),
    metaTitle: optionalString(input.metaTitle, "metaTitle"),
    metaDesc: optionalString(input.metaDesc, "metaDesc"),
    keywords: optionalString(input.keywords, "keywords"),
  };
}

/** Create a new article. */
export async function createArticle(input: ArticleInput) {
  const actor = await authorizeAction("content:write");
  const scalars = parseArticleScalars(input);
  const categorySlugs = parseCategorySlugs(input.categorySlugs);
  const tags = parseTags(input.tags);
  const slug = await resolveUniqueSlug(scalars.title);

  const created = await prisma.article.create({
    data: {
      ...scalars,
      slug,
      authorId: actor.id,
      categories: { connectOrCreate: categoryConnectOrCreate(categorySlugs) },
      tags: { connectOrCreate: tagConnectOrCreate(tags) },
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "article.create",
    entity: ENTITY,
    entityId: created.id,
  });

  revalidateArticlePaths(created.slug);
  return created;
}

/** Update an existing article by id. */
export async function updateArticle(id: string, input: ArticleInput) {
  const actor = await authorizeAction("content:write");
  const articleId = requireString(id, "id");
  const scalars = parseArticleScalars(input);
  const categorySlugs = parseCategorySlugs(input.categorySlugs);
  const tags = parseTags(input.tags);
  const slug = await resolveUniqueSlug(scalars.title, articleId);

  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      ...scalars,
      slug,
      // Replace the relation sets: clear, then connect/create the new members.
      categories: {
        set: [],
        connectOrCreate: categoryConnectOrCreate(categorySlugs),
      },
      tags: {
        set: [],
        connectOrCreate: tagConnectOrCreate(tags),
      },
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "article.update",
    entity: ENTITY,
    entityId: updated.id,
  });

  revalidateArticlePaths(updated.slug);
  return updated;
}

/** Delete an article by id. */
export async function deleteArticle(id: string) {
  const actor = await authorizeAction("content:delete");
  const articleId = requireString(id, "id");

  const deleted = await prisma.article.delete({
    where: { id: articleId },
  });

  await recordAudit({
    actorId: actor.id,
    action: "article.delete",
    entity: ENTITY,
    entityId: deleted.id,
  });

  revalidateArticlePaths(deleted.slug);
  return deleted;
}
