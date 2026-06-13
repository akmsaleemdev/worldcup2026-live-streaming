/**
 * Related-article selection (pure, no IO).
 *
 * Implements Requirement 11.5: when an article is displayed, the platform shows
 * related articles based on shared categories or tags. Given a source article
 * and a corpus, `relatedArticles` returns the corpus articles that share at
 * least one category or tag with the source, excluding the source article
 * itself (matched by `id`).
 *
 * Results are ordered by relevance: the number of shared category/tag matches,
 * descending. Ties preserve the corpus's relative input order (a stable sort),
 * and an optional `limit` caps the number of returned articles. The inputs are
 * never mutated.
 */

/**
 * A minimally-typed article that can participate in related-article selection.
 * Only the fields needed to compute shared category/tag overlap are required.
 */
export interface RelatableArticle {
  id: string;
  categories: string[];
  tags: string[];
}

/**
 * Count how many of the source article's categories and tags also appear in
 * the candidate article. Categories and tags are treated as a single combined
 * pool of labels, so a shared category and a shared tag each contribute one to
 * the score.
 */
function sharedMatchCount(
  source: RelatableArticle,
  candidate: RelatableArticle,
): number {
  const candidateLabels = new Set<string>([
    ...candidate.categories,
    ...candidate.tags,
  ]);

  let score = 0;
  // De-duplicate the source labels so a label repeated across the source's
  // categories and tags is only counted once.
  const sourceLabels = new Set<string>([
    ...source.categories,
    ...source.tags,
  ]);
  for (const label of sourceLabels) {
    if (candidateLabels.has(label)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Select articles from `corpus` related to `article`.
 *
 * An article is related when it shares at least one category or tag with the
 * source. The source article (matched by `id`) is always excluded. Results are
 * ordered by the number of shared category/tag matches, descending; ties keep
 * their relative order from the corpus (stable). When `limit` is provided, at
 * most `limit` articles are returned. The inputs are not mutated.
 *
 * @param article The source article to find related articles for.
 * @param corpus  The pool of candidate articles to search.
 * @param limit   Optional maximum number of related articles to return. A
 *                non-positive limit returns an empty array.
 */
export function relatedArticles<T extends RelatableArticle>(
  article: RelatableArticle,
  corpus: T[],
  limit?: number,
): T[] {
  if (limit !== undefined && limit <= 0) {
    return [];
  }

  const scored = corpus
    .map((candidate, index) => ({
      candidate,
      index,
      score: sharedMatchCount(article, candidate),
    }))
    .filter(({ candidate, score }) => candidate.id !== article.id && score > 0);

  // Sort by score descending; preserve corpus order for ties via the original
  // index, making this a stable ordering.
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const ordered = scored.map(({ candidate }) => candidate);

  return limit === undefined ? ordered : ordered.slice(0, limit);
}
