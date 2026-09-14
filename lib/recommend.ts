import { tokenizeTitle } from "./tokenize";
import type { InterestWeights, Post, UserAction } from "./types";

export function buildInterestWeights(
  actions: UserAction[],
  postsById: Map<string, Post>,
): InterestWeights {
  const subreddits: Record<string, number> = {};
  const words: Record<string, number> = {};

  for (const action of actions) {
    if (action.action !== "like" && action.action !== "dislike") continue;
    const post = postsById.get(action.postId);
    if (!post) continue;

    const delta = action.action === "like" ? 1 : -1;
    subreddits[post.subreddit] = (subreddits[post.subreddit] ?? 0) + delta;

    for (const token of tokenizeTitle(post.title)) {
      words[token] = (words[token] ?? 0) + delta;
    }
  }

  return { subreddits, words };
}

export function scorePost(post: Post, weights: InterestWeights): number {
  let rankScore = post.score / 1000;
  rankScore += weights.subreddits[post.subreddit] ?? 0;

  for (const token of tokenizeTitle(post.title)) {
    rankScore += weights.words[token] ?? 0;
  }

  return rankScore;
}

export function hasPreferenceData(actions: UserAction[]): boolean {
  return actions.some(
    (action) => action.action === "like" || action.action === "dislike",
  );
}

export function rankPosts(posts: Post[], actions: UserAction[]): Post[] {
  if (!hasPreferenceData(actions)) {
    return [...posts].sort((a, b) => b.score - a.score);
  }

  const postsById = new Map(posts.map((post) => [post.id, post]));
  const weights = buildInterestWeights(actions, postsById);

  return [...posts].sort((a, b) => {
    const diff = scorePost(b, weights) - scorePost(a, weights);
    if (diff !== 0) return diff;
    return b.score - a.score;
  });
}

function sortEntries(record: Record<string, number>, positive: boolean) {
  return Object.entries(record)
    .filter(([, value]) => (positive ? value > 0 : value < 0))
    .sort((a, b) => (positive ? b[1] - a[1] : a[1] - b[1]));
}

export function getInterestSummary(
  actions: UserAction[],
  posts: Post[],
): {
  subreddits: [string, number][];
  likedWords: [string, number][];
  dislikedWords: [string, number][];
} {
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const weights = buildInterestWeights(actions, postsById);

  return {
    subreddits: sortEntries(weights.subreddits, true),
    likedWords: sortEntries(weights.words, true),
    dislikedWords: sortEntries(weights.words, false),
  };
}
