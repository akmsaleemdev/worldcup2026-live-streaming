/**
 * JSON-LD structured-data builders (pure, no IO, deterministic).
 *
 * Implements Requirement 8.4 (Organization / SportsEvent / Article structured
 * data) and supports Requirements 13.2 (FAQPage) and 13.3 (entity-relationship
 * data for teams in SportsEvent). Each builder is a pure function that maps a
 * typed input to a valid schema.org JSON-LD plain object: it sets `@context`
 * to "https://schema.org", the correct `@type`, and the entity's key fields,
 * cleanly omitting any undefined/empty optional fields.
 *
 * Because these builders are pure and self-contained, structured-data
 * correctness is property-testable in isolation (Correctness Property 9).
 */

/** The canonical schema.org context value used by every builder. */
export const SCHEMA_CONTEXT = "https://schema.org" as const;

/** schema.org context marker shared by all emitted JSON-LD objects. */
export type SchemaContext = typeof SCHEMA_CONTEXT;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return `true` when an optional value is meaningfully present.
 *
 * Treats `undefined`, `null`, and empty/whitespace-only strings as absent so
 * optional fields are omitted from the output rather than emitted as empty.
 */
function isPresent<T>(value: T | null | undefined): value is T {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/**
 * Build a new object containing only the entries whose values are present.
 *
 * Used to strip undefined/empty optional fields from a builder's output while
 * preserving required fields (which callers always supply as present values).
 */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isPresent(value)) out[key] = value;
  }
  return out as Partial<T>;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

/** Typed input for {@link organizationJsonLd}. */
export interface OrganizationInput {
  /** Organization display name (required). */
  name: string;
  /** Canonical absolute URL of the organization site (required). */
  url: string;
  /** Absolute URL of the organization logo. */
  logo?: string;
  /** Short description of the organization. */
  description?: string;
  /** Social/profile URLs (schema.org `sameAs`). */
  sameAs?: string[];
}

/** schema.org Organization JSON-LD shape. */
export interface OrganizationJsonLd {
  "@context": SchemaContext;
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

/**
 * Build an `Organization` JSON-LD object from organization details.
 *
 * Always sets `@context`/`@type` and the required `name`/`url`; optional
 * fields are included only when present.
 */
export function organizationJsonLd(input: OrganizationInput): OrganizationJsonLd {
  return compact({
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logo,
    description: input.description,
    sameAs: input.sameAs && input.sameAs.length > 0 ? input.sameAs : undefined,
  }) as OrganizationJsonLd;
}

// ---------------------------------------------------------------------------
// SportsEvent
// ---------------------------------------------------------------------------

/** A competing team within a {@link SportsEventInput}. */
export interface SportsTeamInput {
  /** Team name (required). */
  name: string;
  /** Absolute URL of the team logo. */
  logo?: string;
}

/** Typed input for {@link sportsEventJsonLd}. */
export interface SportsEventInput {
  /** Event name, e.g. "Argentina vs Brazil" (required). */
  name: string;
  /** ISO-8601 start date/time (required). */
  startDate: string;
  /** ISO-8601 end date/time. */
  endDate?: string;
  /** Venue/location name, e.g. "MetLife Stadium". */
  location?: string;
  /** Home team. */
  homeTeam?: SportsTeamInput;
  /** Away team. */
  awayTeam?: SportsTeamInput;
  /** Canonical absolute URL of the event detail page. */
  url?: string;
  /** schema.org eventStatus IRI, e.g. ".../EventScheduled". */
  eventStatus?: string;
  /** Short description of the event. */
  description?: string;
}

/** schema.org SportsTeam reference. */
export interface SportsTeamJsonLd {
  "@type": "SportsTeam";
  name: string;
  logo?: string;
}

/** schema.org Place reference used for `location`. */
export interface PlaceJsonLd {
  "@type": "Place";
  name: string;
}

/** schema.org SportsEvent JSON-LD shape. */
export interface SportsEventJsonLd {
  "@context": SchemaContext;
  "@type": "SportsEvent";
  name: string;
  startDate: string;
  endDate?: string;
  location?: PlaceJsonLd;
  homeTeam?: SportsTeamJsonLd;
  awayTeam?: SportsTeamJsonLd;
  url?: string;
  eventStatus?: string;
  description?: string;
}

/** Map a team input to a SportsTeam node, omitting absent optional fields. */
function sportsTeam(team: SportsTeamInput | undefined): SportsTeamJsonLd | undefined {
  if (!team || !isPresent(team.name)) return undefined;
  return compact({
    "@type": "SportsTeam",
    name: team.name,
    logo: team.logo,
  }) as SportsTeamJsonLd;
}

/**
 * Build a `SportsEvent` JSON-LD object from match/event details.
 *
 * Always sets `@context`/`@type`, the required `name`/`startDate`, and nests
 * home/away teams as `SportsTeam` competitors when supplied. Optional fields
 * (location, url, status, description, endDate) are included only when present.
 */
export function sportsEventJsonLd(input: SportsEventInput): SportsEventJsonLd {
  const location = isPresent(input.location)
    ? ({ "@type": "Place", name: input.location } satisfies PlaceJsonLd)
    : undefined;

  return compact({
    "@context": SCHEMA_CONTEXT,
    "@type": "SportsEvent",
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    location,
    homeTeam: sportsTeam(input.homeTeam),
    awayTeam: sportsTeam(input.awayTeam),
    url: input.url,
    eventStatus: input.eventStatus,
    description: input.description,
  }) as SportsEventJsonLd;
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

/** Typed input for {@link articleJsonLd}. */
export interface ArticleInput {
  /** Article headline/title (required). */
  headline: string;
  /** ISO-8601 publication date (required). */
  datePublished: string;
  /** ISO-8601 last-modified date. */
  dateModified?: string;
  /** Author display name. */
  author?: string;
  /** Absolute URL(s) of representative image(s). */
  image?: string | string[];
  /** Short description/summary. */
  description?: string;
  /** Canonical absolute URL of the article. */
  url?: string;
  /** Publisher organization (rendered as a nested Organization node). */
  publisher?: OrganizationInput;
  /**
   * Whether to emit `@type: "NewsArticle"` instead of the default `"Article"`.
   * Both are valid schema.org article types.
   */
  isNewsArticle?: boolean;
}

/** schema.org Person reference used for `author`. */
export interface PersonJsonLd {
  "@type": "Person";
  name: string;
}

/** schema.org Article (or NewsArticle) JSON-LD shape. */
export interface ArticleJsonLd {
  "@context": SchemaContext;
  "@type": "Article" | "NewsArticle";
  headline: string;
  datePublished: string;
  dateModified?: string;
  author?: PersonJsonLd;
  image?: string | string[];
  description?: string;
  url?: string;
  publisher?: OrganizationJsonLd;
}

/**
 * Build an `Article` (or `NewsArticle`) JSON-LD object from article details.
 *
 * Always sets `@context`/`@type`, the required `headline`/`datePublished`, and
 * nests author/publisher nodes when supplied. Optional fields are included only
 * when present.
 */
export function articleJsonLd(input: ArticleInput): ArticleJsonLd {
  const author = isPresent(input.author)
    ? ({ "@type": "Person", name: input.author } satisfies PersonJsonLd)
    : undefined;

  const image = Array.isArray(input.image)
    ? input.image.filter(isPresent)
    : input.image;

  return compact({
    "@context": SCHEMA_CONTEXT,
    "@type": input.isNewsArticle ? "NewsArticle" : "Article",
    headline: input.headline,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author,
    image: Array.isArray(image) ? (image.length > 0 ? image : undefined) : image,
    description: input.description,
    url: input.url,
    publisher: input.publisher ? organizationJsonLd(input.publisher) : undefined,
  }) as ArticleJsonLd;
}

// ---------------------------------------------------------------------------
// FAQPage
// ---------------------------------------------------------------------------

/** A single FAQ entry consumed by {@link faqPageJsonLd}. */
export interface FaqInput {
  /** The question text (required). */
  question: string;
  /** The answer text (required). */
  answer: string;
}

/** schema.org Answer node nested inside a {@link QuestionJsonLd}. */
export interface AnswerJsonLd {
  "@type": "Answer";
  text: string;
}

/** schema.org Question node nested inside a {@link FaqPageJsonLd}. */
export interface QuestionJsonLd {
  "@type": "Question";
  name: string;
  acceptedAnswer: AnswerJsonLd;
}

/** schema.org FAQPage JSON-LD shape. */
export interface FaqPageJsonLd {
  "@context": SchemaContext;
  "@type": "FAQPage";
  mainEntity: QuestionJsonLd[];
}

/**
 * Build a `FAQPage` JSON-LD object from a list of FAQ entries.
 *
 * Every input FAQ produces one `Question` node whose `name` is the question and
 * whose `acceptedAnswer.text` is the answer, preserving input order. This
 * guarantees that each input question and answer appears in the output
 * (Correctness Property 9).
 */
export function faqPageJsonLd(faqs: FaqInput[]): FaqPageJsonLd {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Entity-relationship: Athlete (Person) and SportsTeam
// ---------------------------------------------------------------------------
//
// These builders emit entity-relationship structured data for the platform's
// core sporting entities (Requirement 13.3). They are deliberately distinct
// from the lightweight `SportsTeam` competitor node nested inside a
// `SportsEvent`: here the relationships are first-class — an athlete points at
// the team they are a `memberOf`, and a team lists its `athlete` roster and the
// organization it is a `memberOf` — so answer engines can traverse the
// player ↔ team ↔ competition graph.

/** A team reference used to express an athlete's `memberOf` relationship. */
export interface TeamReferenceInput {
  /** Team name (required). */
  name: string;
  /** Canonical absolute URL of the team page. */
  url?: string;
}

/** Typed input for {@link athleteJsonLd}. */
export interface AthleteInput {
  /** Player display name (required). */
  name: string;
  /** Canonical absolute URL of the player profile. */
  url?: string;
  /** Absolute URL of the player photo. */
  image?: string;
  /** Playing position, surfaced as schema.org `jobTitle`. */
  position?: string;
  /** The team the player belongs to (schema.org `memberOf`). */
  team?: TeamReferenceInput;
}

/** schema.org SportsTeam reference nested as an athlete's `memberOf`. */
export interface AthleteMemberOfJsonLd {
  "@type": "SportsTeam";
  name: string;
  url?: string;
}

/** schema.org Person (athlete) JSON-LD shape. */
export interface AthleteJsonLd {
  "@context": SchemaContext;
  "@type": "Person";
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  memberOf?: AthleteMemberOfJsonLd;
}

/**
 * Build an athlete `Person` JSON-LD object expressing the player→team
 * relationship.
 *
 * Always sets `@context`/`@type` and the required `name`; nests the player's
 * team as a `SportsTeam` `memberOf` node when supplied. Optional fields are
 * included only when present.
 */
export function athleteJsonLd(input: AthleteInput): AthleteJsonLd {
  const memberOf =
    input.team && isPresent(input.team.name)
      ? (compact({
          "@type": "SportsTeam",
          name: input.team.name,
          url: input.team.url,
        }) as AthleteMemberOfJsonLd)
      : undefined;

  return compact({
    "@context": SCHEMA_CONTEXT,
    "@type": "Person",
    name: input.name,
    url: input.url,
    image: input.image,
    jobTitle: input.position,
    memberOf,
  }) as AthleteJsonLd;
}

/** A roster member reference within a {@link SportsTeamEntityInput}. */
export interface TeamAthleteInput {
  /** Player name (required). */
  name: string;
  /** Canonical absolute URL of the player profile. */
  url?: string;
}

/** Typed input for {@link sportsTeamEntityJsonLd}. */
export interface SportsTeamEntityInput {
  /** Team name (required). */
  name: string;
  /** Canonical absolute URL of the team page. */
  url?: string;
  /** Absolute URL of the team logo. */
  logo?: string;
  /** The sport the team plays; defaults to "Soccer" when omitted. */
  sport?: string;
  /** Head coach name (schema.org `coach` Person). */
  coach?: string;
  /** Roster (schema.org `athlete` Person nodes). */
  athletes?: TeamAthleteInput[];
  /** Name of the competition/organization the team is `memberOf`. */
  memberOf?: string;
}

/** schema.org Person reference nested as a team `athlete` or `coach`. */
export interface TeamPersonJsonLd {
  "@type": "Person";
  name: string;
  url?: string;
}

/** schema.org SportsOrganization reference nested as a team `memberOf`. */
export interface SportsOrganizationJsonLd {
  "@type": "SportsOrganization";
  name: string;
}

/** schema.org SportsTeam entity JSON-LD shape (full entity, not a competitor). */
export interface SportsTeamEntityJsonLd {
  "@context": SchemaContext;
  "@type": "SportsTeam";
  name: string;
  sport: string;
  url?: string;
  logo?: string;
  coach?: TeamPersonJsonLd;
  athlete?: TeamPersonJsonLd[];
  memberOf?: SportsOrganizationJsonLd;
}

/**
 * Build a `SportsTeam` entity JSON-LD object expressing the team→roster and
 * team→competition relationships.
 *
 * Always sets `@context`/`@type`, the required `name`, and a `sport`
 * (defaulting to "Soccer"). The roster is emitted as `athlete` `Person` nodes
 * (one per supplied roster member) and the competition as a
 * `SportsOrganization` `memberOf` node. Optional fields are included only when
 * present.
 */
export function sportsTeamEntityJsonLd(
  input: SportsTeamEntityInput,
): SportsTeamEntityJsonLd {
  const coach = isPresent(input.coach)
    ? ({ "@type": "Person", name: input.coach } satisfies TeamPersonJsonLd)
    : undefined;

  const athletes = (input.athletes ?? [])
    .filter((athlete) => isPresent(athlete.name))
    .map(
      (athlete) =>
        compact({
          "@type": "Person",
          name: athlete.name,
          url: athlete.url,
        }) as TeamPersonJsonLd,
    );

  const memberOf = isPresent(input.memberOf)
    ? ({
        "@type": "SportsOrganization",
        name: input.memberOf,
      } satisfies SportsOrganizationJsonLd)
    : undefined;

  return compact({
    "@context": SCHEMA_CONTEXT,
    "@type": "SportsTeam",
    name: input.name,
    sport: isPresent(input.sport) ? input.sport : "Soccer",
    url: input.url,
    logo: input.logo,
    coach,
    athlete: athletes.length > 0 ? athletes : undefined,
    memberOf,
  }) as SportsTeamEntityJsonLd;
}
