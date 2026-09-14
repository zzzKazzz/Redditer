"use client";

import { useCallback, useEffect, useState } from "react";
import { PostList } from "@/components/PostList";
import {
  getActionStates,
  getPostsByIds,
  getSavedPostIdsNewestFirst,
  recordView,
  setPreference,
  toggleSave,
} from "@/lib/db";
import type { ActionState, Post } from "@/lib/types";

export function SavedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {},
  );

  const reload = useCallback(async () => {
    const ids = await getSavedPostIdsNewestFirst();
    const [savedPosts, states] = await Promise.all([
      getPostsByIds(ids),
      getActionStates(),
    ]);
    const byId = new Map(savedPosts.map((post) => [post.id, post]));
    setPosts(ids.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : [])));
    setActionStates(states);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleLike = useCallback(
    async (postId: string) => {
      await setPreference(postId, "like");
      await reload();
    },
    [reload],
  );

  const handleDislike = useCallback(
    async (postId: string) => {
      await setPreference(postId, "dislike");
      await reload();
    },
    [reload],
  );

  const handleSave = useCallback(
    async (postId: string) => {
      await toggleSave(postId);
      await reload();
    },
    [reload],
  );

  const handleView = useCallback(async (postId: string) => {
    await recordView(postId);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <header>
        <p className="text-xs tracking-[0.2em] text-muted uppercase">
          Redditer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">保存</h1>
      </header>
      <PostList
        posts={posts}
        actionStates={actionStates}
        emptyMessage="保存した投稿はまだありません。"
        onLike={handleLike}
        onDislike={handleDislike}
        onSave={handleSave}
        onView={handleView}
      />
    </main>
  );
}
