import { foldSearchText } from "@/lib/geo";
import type { CoverageRequest, EventSummary, FirsthandReport } from "@/lib/types";
import type { GeographySearchHit } from "@/lib/data/geography";

/**
 * Lexical Firsthand search.
 *
 * This query/result shape is the stable API. Later retrieval modes
 * (transcripts, embeddings, query rewriting) should implement the same
 * `SearchQuery` → `SearchResults` contract rather than replacing routes or
 * result groups.
 */
export type SearchKind = "all" | "places" | "events" | "reports" | "requests" | "reporters";
export type SearchTimeRange = "any" | "24h" | "7d" | "30d";
export type SearchRetrieval = "lexical";

export type SearchQuery = {
  q: string;
  kind: SearchKind;
  timeRange: SearchTimeRange;
  retrieval?: SearchRetrieval;
};

export type SearchReporterHit = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  context: string;
  reportCount: number;
  placeCount: number;
};

export type SearchResults = {
  query: SearchQuery;
  places: GeographySearchHit[];
  events: EventSummary[];
  reports: FirsthandReport[];
  requests: CoverageRequest[];
  reporters: SearchReporterHit[];
};

export const SEARCH_KINDS: Array<{ id: SearchKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "places", label: "Places" },
  { id: "events", label: "Events" },
  { id: "reports", label: "Reports" },
  { id: "requests", label: "Coverage wanted" },
  { id: "reporters", label: "Reporters" },
];

export const SEARCH_RANGES: Array<{ id: SearchTimeRange; label: string }> = [
  { id: "any", label: "Any time" },
  { id: "24h", label: "Past 24 hours" },
  { id: "7d", label: "Past 7 days" },
  { id: "30d", label: "Past 30 days" },
];

export const SEARCH_LIMIT = {
  grouped: 8,
  filtered: 24,
} as const;

export function parseSearchQuery(input: {
  q?: string | string[];
  kind?: string | string[];
  range?: string | string[];
}): SearchQuery {
  const q = (Array.isArray(input.q) ? input.q[0] : input.q)?.trim() ?? "";
  const kindValue = Array.isArray(input.kind) ? input.kind[0] : input.kind;
  const rangeValue = Array.isArray(input.range) ? input.range[0] : input.range;
  const kind: SearchKind = SEARCH_KINDS.some((item) => item.id === kindValue)
    ? (kindValue as SearchKind)
    : "all";
  const timeRange: SearchTimeRange = SEARCH_RANGES.some((item) => item.id === rangeValue)
    ? (rangeValue as SearchTimeRange)
    : "any";
  return { q, kind, timeRange, retrieval: "lexical" };
}

export function searchHref(query: SearchQuery, patch?: Partial<SearchQuery>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) {
    params.set("q", next.q);
  }
  if (next.kind !== "all") {
    params.set("kind", next.kind);
  }
  if (next.timeRange !== "any") {
    params.set("range", next.timeRange);
  }
  const encoded = params.toString();
  return encoded ? `/search?${encoded}` : "/search";
}

export function emptySearchResults(query: SearchQuery): SearchResults {
  return {
    query,
    places: [],
    events: [],
    reports: [],
    requests: [],
    reporters: [],
  };
}

export function searchSince(range: SearchTimeRange, now = Date.now()): string | null {
  if (range === "any") {
    return null;
  }
  const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export function sanitizeSearchTerm(value: string) {
  return foldSearchText(value)
    .replace(/[%_\\,()&|!:*'<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function lexicalMatchScore(haystack: string, needle: string) {
  const h = foldSearchText(haystack);
  const n = foldSearchText(needle);
  if (!n || !h) {
    return 0;
  }
  if (h === n) {
    return 100;
  }
  if (h.startsWith(n) || h.split(/[\s,/]+/).includes(n)) {
    return 80;
  }
  if (h.includes(n)) {
    return 50;
  }
  return 0;
}

export function recencyBoost(iso: string | null | undefined, now = Date.now()) {
  if (!iso) {
    return 0;
  }
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return 0;
  }
  const days = (now - then) / 86_400_000;
  if (days < 1) {
    return 20;
  }
  if (days < 7) {
    return 12;
  }
  if (days < 30) {
    return 6;
  }
  return 0;
}

export function rankPlaces(hits: GeographySearchHit[], needle: string) {
  return [...hits].sort((a, b) => {
    const score =
      lexicalMatchScore(a.title, needle) + lexicalMatchScore(a.subtitle, needle) * 0.4
      - (lexicalMatchScore(b.title, needle) + lexicalMatchScore(b.subtitle, needle) * 0.4);
    if (score !== 0) {
      return score > 0 ? -1 : 1;
    }
    return b.reportCount + b.openRequestCount - (a.reportCount + a.openRequestCount);
  });
}

export function rankEvents(events: EventSummary[], needle: string) {
  return [...events].sort((a, b) => {
    const scoreA =
      lexicalMatchScore(a.title, needle) +
      lexicalMatchScore(a.location.label, needle) * 0.8 +
      (a.status === "active" ? 25 : 0) +
      recencyBoost(a.startedAt);
    const scoreB =
      lexicalMatchScore(b.title, needle) +
      lexicalMatchScore(b.location.label, needle) * 0.8 +
      (b.status === "active" ? 25 : 0) +
      recencyBoost(b.startedAt);
    return scoreB - scoreA || b.startedAt.localeCompare(a.startedAt);
  });
}

export function rankReports(reports: FirsthandReport[], needle: string) {
  return [...reports].sort((a, b) => {
    const scoreA =
      lexicalMatchScore(a.title, needle) +
      lexicalMatchScore(a.location, needle) * 0.8 +
      lexicalMatchScore(a.excerpt, needle) * 0.2 +
      recencyBoost(a.capturedAt);
    const scoreB =
      lexicalMatchScore(b.title, needle) +
      lexicalMatchScore(b.location, needle) * 0.8 +
      lexicalMatchScore(b.excerpt, needle) * 0.2 +
      recencyBoost(b.capturedAt);
    return scoreB - scoreA || b.publishedAt.localeCompare(a.publishedAt);
  });
}

export function rankRequests(requests: CoverageRequest[], needle: string) {
  return [...requests].sort((a, b) => {
    const scoreA =
      lexicalMatchScore(a.title, needle) +
      lexicalMatchScore(a.location, needle) * 0.8 +
      Math.min(a.supporterCount, 40);
    const scoreB =
      lexicalMatchScore(b.title, needle) +
      lexicalMatchScore(b.location, needle) * 0.8 +
      Math.min(b.supporterCount, 40);
    return scoreB - scoreA || b.createdAt.localeCompare(a.createdAt);
  });
}

export function rankReporters(reporters: SearchReporterHit[], needle: string) {
  return [...reporters].sort((a, b) => {
    const scoreA =
      lexicalMatchScore(a.displayName, needle) +
      lexicalMatchScore(a.username, needle) +
      lexicalMatchScore(a.context, needle) * 0.5 +
      Math.min(a.reportCount, 20);
    const scoreB =
      lexicalMatchScore(b.displayName, needle) +
      lexicalMatchScore(b.username, needle) +
      lexicalMatchScore(b.context, needle) * 0.5 +
      Math.min(b.reportCount, 20);
    return scoreB - scoreA || a.displayName.localeCompare(b.displayName);
  });
}

export function limitSearchResults(results: SearchResults): SearchResults {
  const limit = results.query.kind === "all" ? SEARCH_LIMIT.grouped : SEARCH_LIMIT.filtered;
  return {
    ...results,
    places: results.query.kind === "all" || results.query.kind === "places" ? results.places.slice(0, limit) : [],
    events: results.query.kind === "all" || results.query.kind === "events" ? results.events.slice(0, limit) : [],
    reports: results.query.kind === "all" || results.query.kind === "reports" ? results.reports.slice(0, limit) : [],
    requests:
      results.query.kind === "all" || results.query.kind === "requests" ? results.requests.slice(0, limit) : [],
    reporters:
      results.query.kind === "all" || results.query.kind === "reporters" ? results.reporters.slice(0, limit) : [],
  };
}

export function searchResultCount(results: SearchResults) {
  return (
    results.places.length +
    results.events.length +
    results.reports.length +
    results.requests.length +
    results.reporters.length
  );
}
