import Dexie, { type Table } from "dexie";
import type { ActionState, Post, UserAction, UserActionType } from "./types";

class RedditerDB extends Dexie {
  posts!: Table<Post, string>;
  userActions!: Table<UserAction, [string, UserActionType]>;

  constructor() {
    super("redditer");
    this.version(1).stores({
      posts: "id, subreddit, score, fetchedAt",
      userActions: "[postId+action], postId, action, timestamp",
    });
  }
}

export const db = new RedditerDB();

export async function upsertPosts(posts: Post[]): Promise<void> {
  if (posts.length === 0) return;
  await db.posts.bulkPut(posts);
}

export async function getAllPosts(): Promise<Post[]> {
  return db.posts.toArray();
}

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  const unique = [...new Set(ids)];
  const rows = await db.posts.bulkGet(unique);
  return rows.filter((row): row is Post => row != null);
}

export async function getAllActions(): Promise<UserAction[]> {
  return db.userActions.toArray();
}

export async function getActionStates(): Promise<Record<string, ActionState>> {
  const actions = await db.userActions.toArray();
  const states: Record<string, ActionState> = {};

  for (const action of actions) {
    const current = states[action.postId] ?? {
      like: false,
      dislike: false,
      save: false,
    };
    if (action.action === "like") current.like = true;
    if (action.action === "dislike") current.dislike = true;
    if (action.action === "save") current.save = true;
    states[action.postId] = current;
  }

  return states;
}

export async function setPreference(
  postId: string,
  action: "like" | "dislike",
): Promise<void> {
  const opposite = action === "like" ? "dislike" : "like";
  const existing = await db.userActions.get([postId, action]);

  await db.transaction("rw", db.userActions, async () => {
    await db.userActions.delete([postId, opposite]);
    if (existing) {
      await db.userActions.delete([postId, action]);
      return;
    }
    await db.userActions.put({
      postId,
      action,
      timestamp: Date.now(),
    });
  });
}

export async function toggleSave(postId: string): Promise<void> {
  const existing = await db.userActions.get([postId, "save"]);
  if (existing) {
    await db.userActions.delete([postId, "save"]);
    return;
  }
  await db.userActions.put({
    postId,
    action: "save",
    timestamp: Date.now(),
  });
}

export async function recordView(postId: string): Promise<void> {
  const existing = await db.userActions.get([postId, "view"]);
  if (existing) return;
  await db.userActions.put({
    postId,
    action: "view",
    timestamp: Date.now(),
  });
}

export async function getViewedPostIds(): Promise<string[]> {
  const viewed = await db.userActions.where("action").equals("view").toArray();
  return viewed.map((row) => row.postId);
}

export async function getSavedPostIdsNewestFirst(): Promise<string[]> {
  const saved = await db.userActions.where("action").equals("save").toArray();
  saved.sort((a, b) => b.timestamp - a.timestamp);
  return saved.map((row) => row.postId);
}
