/**
 * Server component that emits a JSON-LD `<script>` tag (Requirement 8.4).
 *
 * Renders structured data produced by the pure builders in `lib/seo/jsonld.ts`
 * (via the helpers in `lib/seo/site.ts`) as a
 * `<script type="application/ld+json">` element. Use it in layouts and detail
 * pages, e.g. `<JsonLd data={siteOrganizationJsonLd()} />`.
 *
 * The serialized payload is trusted, builder-generated structured data (never
 * raw user input), so `dangerouslySetInnerHTML` is the appropriate, standard
 * mechanism for inlining JSON-LD. The `<` escape guards against an edge case
 * where string field values could otherwise prematurely close the script tag.
 */

import type { ReactElement } from "react";

/** A single JSON-LD object or an array of them. */
export type JsonLdData = object;

/** Props for {@link JsonLd}. */
export interface JsonLdProps {
  /** The structured-data object(s) to serialize and emit. */
  data: JsonLdData;
}

/** Render trusted structured data as an inline JSON-LD script tag. */
export function JsonLd({ data }: JsonLdProps): ReactElement {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // Builder-generated, trusted structured data (not user input).
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export default JsonLd;
