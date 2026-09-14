import { isAllowedSubreddit } from "@/lib/subreddits";
import { parseFeedQuery, redditListingUrl, type FeedQuery } from "@/lib/feed";
import { normalizeRedditAtom, normalizeRedditListing } from "@/lib/reddit";

const USER_AGENT = "web:redditer:v0.1.0 (by /u/redditer_mvp)";

function isJsonContentType(value: string | null): boolean {
  return Boolean(value?.toLowerCase().includes("json"));
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonPosts(subreddit: string, query: FeedQuery) {
  const response = await fetch(redditListingUrl("json", subreddit, query), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok || !isJsonContentType(response.headers.get("content-type"))) {
    return null;
  }

  const json: unknown = await response.json();
  const posts = normalizeRedditListing(json);
  return posts.length > 0 ? posts : null;
}

async function fetchRssPosts(subreddit: string, query: FeedQuery) {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) {
      await delay(2000);
    }

    const response = await fetch(redditListingUrl("rss", subreddit, query), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/atom+xml, application/rss+xml, text/xml",
      },
      cache: "no-store",
    });

    lastStatus = response.status;
    if (response.status === 429) continue;
    if (!response.ok) {
      throw new Error(`Reddit が ${response.status} を返しました (${subreddit})`);
    }

    const xml = await response.text();
    const posts = normalizeRedditAtom(xml);
    if (posts.length === 0) {
      throw new Error(`${subreddit} の RSS を解析できませんでした`);
    }
    return posts;
  }

  throw new Error(`Reddit が ${lastStatus} を返しました (${subreddit})`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subreddit = searchParams.get("subreddit") ?? "";
  const query = parseFeedQuery(searchParams.get("sort"), searchParams.get("t"));

  if (!isAllowedSubreddit(subreddit)) {
    return Response.json(
      { error: "未対応の subreddit です" },
      { status: 400 },
    );
  }

  try {
    const posts = await fetchRssPosts(subreddit, query);
    return Response.json({ posts });
  } catch (rssError) {
    const rateLimited =
      rssError instanceof Error && rssError.message.includes("429");
    if (!rateLimited) {
      try {
        const posts = await fetchJsonPosts(subreddit, query);
        if (posts) {
          return Response.json({ posts });
        }
      } catch {
        // JSON is a last resort; RSS error is more informative.
      }
    }

    const message =
      rssError instanceof Error
        ? rssError.message
        : `${subreddit} の取得中にエラーが発生しました`;
    return Response.json({ error: message }, { status: 502 });
  }
}
