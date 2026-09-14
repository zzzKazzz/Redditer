import { isValidSubredditName, readStoredSubreddits } from "./subreddits";
import { DEFAULT_FEED_QUERY, type FeedQuery } from "./feed";
import type { Post } from "./types";

const SELFTEXT_MAX = 500;
const FETCH_CONCURRENCY = 1;
const FETCH_STAGGER_MS = 900;

type RedditChildData = {
  id?: string;
  title?: string;
  subreddit?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  permalink?: string;
  url?: string;
  thumbnail?: string;
  selftext?: string;
  stickied?: boolean;
  removed_by_category?: string | null;
  preview?: { images?: { source?: { url?: string } }[] };
};

type RedditListing = {
  data?: {
    children?: { data?: RedditChildData }[];
  };
};

export type RedditPostPayload = Omit<Post, "fetchedAt">;

function decodeUrl(value: string): string {
  return value.replaceAll("&amp;", "&");
}

function extractImageUrl(data: RedditChildData): string | null {
  const preview = data.preview?.images?.[0]?.source?.url;
  if (preview && preview.startsWith("http")) {
    return decodeUrl(preview);
  }

  const thumbnail = data.thumbnail;
  if (typeof thumbnail === "string" && thumbnail.startsWith("http")) {
    return decodeUrl(thumbnail);
  }

  return null;
}

export function normalizeRedditListing(json: unknown): RedditPostPayload[] {
  const listing = json as RedditListing;
  const children = listing.data?.children ?? [];
  const posts: RedditPostPayload[] = [];
  const seen = new Set<string>();

  for (const child of children) {
    const data = child.data;
    if (!data?.id || !data.title || !data.subreddit || !data.permalink) continue;
    if (data.stickied) continue;
    if (data.removed_by_category) continue;
    if (data.selftext === "[removed]" || data.selftext === "[deleted]") continue;
    if (seen.has(data.id)) continue;
    seen.add(data.id);

    const selftext = (data.selftext ?? "").slice(0, SELFTEXT_MAX);

    posts.push({
      id: data.id,
      title: data.title,
      subreddit: data.subreddit,
      score: data.score ?? 0,
      comments: data.num_comments ?? 0,
      createdAt: data.created_utc ?? 0,
      permalink: data.permalink,
      url: data.url ?? `https://www.reddit.com${data.permalink}`,
      imageUrl: extractImageUrl(data),
      selftext,
    });
  }

  return posts;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function tagAttr(block: string, tag: string, attr: string): string {
  const match = block.match(
    new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i"),
  );
  return match ? decodeXml(match[1]) : "";
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPermalink(href: string): string {
  try {
    const url = new URL(href);
    return url.pathname;
  } catch {
    return href.startsWith("/") ? href : `/${href}`;
  }
}

export function normalizeRedditAtom(xml: string): RedditPostPayload[] {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  const posts: RedditPostPayload[] = [];
  const seen = new Set<string>();

  for (const [index, entryMatch] of entries.entries()) {
    const block = entryMatch[1] ?? "";
    const rawId = tagText(block, "id");
    const idFromTag = rawId.replace(/^t3_/i, "");
    const permalinkHref = tagAttr(block, "link", "href");
    const permalink = permalinkHref
      ? toPermalink(permalinkHref)
      : "";
    const idFromPermalink = permalink.match(/\/comments\/([^/]+)/)?.[1] ?? "";
    const id = idFromTag || idFromPermalink;
    const title = tagText(block, "title");
    const subreddit =
      tagAttr(block, "category", "term") ||
      permalink.match(/\/r\/([^/]+)/)?.[1] ||
      "";

    if (!id || !title || !subreddit || !permalink) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const content = tagText(block, "content");
    const linkMatch = content.match(/<a href="([^"]+)">\[link\]<\/a>/i);
    const url = linkMatch?.[1] ?? permalinkHref ?? `https://www.reddit.com${permalink}`;
    const thumbnail = tagAttr(block, "media:thumbnail", "url");
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = thumbnail || imgMatch?.[1] || null;
    const published = tagText(block, "published") || tagText(block, "updated");
    const createdAt = published ? Math.floor(Date.parse(published) / 1000) || 0 : 0;
    const selftext = stripTags(content)
      .replace(/submitted by\s+\/u\/\S[\s\S]*$/i, "")
      .trim()
      .slice(0, SELFTEXT_MAX);

    posts.push({
      id,
      title,
      subreddit,
      score: Math.max(100, 2500 - index * 80),
      comments: 0,
      createdAt,
      permalink,
      url,
      imageUrl,
      selftext,
    });
  }

  return posts;
}

function mergePosts(groups: RedditPostPayload[][]): RedditPostPayload[] {
  const byId = new Map<string, RedditPostPayload>();
  for (const group of groups) {
    for (const post of group) {
      const existing = byId.get(post.id);
      if (!existing || post.score > existing.score) {
        byId.set(post.id, post);
      }
    }
  }
  return [...byId.values()];
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
      await new Promise((resolve) => setTimeout(resolve, FETCH_STAGGER_MS));
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function fetchSubredditPosts(
  subreddit: string,
  query: FeedQuery = DEFAULT_FEED_QUERY,
): Promise<RedditPostPayload[]> {
  if (!isValidSubredditName(subreddit)) {
    throw new Error(`subreddit 名が正しくありません: ${subreddit}`);
  }

  const params = new URLSearchParams({
    subreddit,
    sort: query.sort,
  });
  if (query.sort === "top") params.set("t", query.period);

  const response = await fetch(`/api/reddit?${params.toString()}`);
  const body = (await response.json()) as {
    posts?: RedditPostPayload[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `${subreddit} の取得に失敗しました`);
  }

  return body.posts ?? [];
}

export async function fetchAllSubredditPosts(
  query: FeedQuery = DEFAULT_FEED_QUERY,
  onBatch?: (posts: Post[], errors: string[]) => void | Promise<void>,
): Promise<{
  posts: Post[];
  errors: string[];
}> {
  const fetchedAt = new Date().toISOString();
  const errors: string[] = [];
  const collected: RedditPostPayload[][] = [];

  const subreddits = readStoredSubreddits();
  const groups = await mapPool(subreddits, FETCH_CONCURRENCY, async (subreddit) => {
    try {
      const batch = await fetchSubredditPosts(subreddit, query);
      collected.push(batch);
      await onBatch?.(
        mergePosts(collected).map((post) => ({ ...post, fetchedAt })),
        errors,
      );
      return batch;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${subreddit} の取得に失敗しました`;
      errors.push(message);
      await onBatch?.(
        mergePosts(collected).map((post) => ({ ...post, fetchedAt })),
        errors,
      );
      return [] as RedditPostPayload[];
    }
  });

  const posts = mergePosts(groups).map((post) => ({ ...post, fetchedAt }));
  return { posts, errors };
}
