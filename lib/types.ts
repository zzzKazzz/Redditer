export type Post = {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  comments: number;
  createdAt: number;
  permalink: string;
  url: string;
  imageUrl: string | null;
  selftext: string;
  fetchedAt: string;
};

export type UserActionType = "like" | "dislike" | "save" | "view";

export type UserAction = {
  postId: string;
  action: UserActionType;
  timestamp: number;
};

export type ActionState = {
  like: boolean;
  dislike: boolean;
  save: boolean;
};

export type InterestWeights = {
  subreddits: Record<string, number>;
  words: Record<string, number>;
};
