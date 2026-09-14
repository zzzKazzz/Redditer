/** 取得対象。追加・変更はこの配列だけ。 */
export const SUBREDDITS = [
  "all",
  "AskReddit",
  "technology",
  "todayilearned",
  "funny",
  "worldnews",
] as const;

export type Subreddit = (typeof SUBREDDITS)[number];

export function isAllowedSubreddit(value: string): value is Subreddit {
  return (SUBREDDITS as readonly string[]).includes(value);
}
