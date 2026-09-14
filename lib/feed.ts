export const FEED_SORTS = ["hot", "top"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export const TOP_PERIODS = [
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
] as const;
export type TopPeriod = (typeof TOP_PERIODS)[number];

export type FeedQuery = {
  sort: FeedSort;
  period: TopPeriod;
};

export const DEFAULT_FEED_QUERY: FeedQuery = {
  sort: "hot",
  period: "day",
};

export const TOP_PERIOD_LABELS: Record<TopPeriod, string> = {
  hour: "1時間",
  day: "24時間",
  week: "1週間",
  month: "1ヶ月",
  year: "1年",
  all: "すべて",
};

const STORAGE_KEY = "redditer.feedQuery";

export function isFeedSort(value: string): value is FeedSort {
  return (FEED_SORTS as readonly string[]).includes(value);
}

export function isTopPeriod(value: string): value is TopPeriod {
  return (TOP_PERIODS as readonly string[]).includes(value);
}

export function parseFeedQuery(
  sortValue: string | null,
  periodValue: string | null,
): FeedQuery {
  const sort = sortValue && isFeedSort(sortValue) ? sortValue : "hot";
  const period =
    periodValue && isTopPeriod(periodValue) ? periodValue : "day";
  return { sort, period };
}

export function redditListingUrl(
  kind: "rss" | "json",
  subreddit: string,
  query: FeedQuery,
): string {
  const listing = query.sort === "top" ? "top" : "hot";
  const ext = kind === "rss" ? "rss" : "json";
  const params = new URLSearchParams({ limit: "25" });
  if (kind === "json") params.set("raw_json", "1");
  if (query.sort === "top") params.set("t", query.period);
  return `https://www.reddit.com/r/${subreddit}/${listing}.${ext}?${params.toString()}`;
}

export function readStoredFeedQuery(): FeedQuery {
  if (typeof window === "undefined") return DEFAULT_FEED_QUERY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEED_QUERY;
    const parsed = JSON.parse(raw) as { sort?: string; period?: string };
    return parseFeedQuery(parsed.sort ?? null, parsed.period ?? null);
  } catch {
    return DEFAULT_FEED_QUERY;
  }
}

export function writeStoredFeedQuery(query: FeedQuery): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(query));
}
