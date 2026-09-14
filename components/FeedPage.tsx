"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedSortBar } from "@/components/FeedSortBar";
import { PostList } from "@/components/PostList";
import {
  getActionStates,
  getAllActions,
  recordView,
  setPreference,
  toggleSave,
  upsertPosts,
} from "@/lib/db";
import {
  DEFAULT_FEED_QUERY,
  readStoredFeedQuery,
  writeStoredFeedQuery,
  type FeedQuery,
} from "@/lib/feed";
import { rankPosts } from "@/lib/recommend";
import { fetchAllSubredditPosts } from "@/lib/reddit";
import type { ActionState, Post } from "@/lib/types";

export function FeedPage() {
  const [query, setQuery] = useState<FeedQuery>(DEFAULT_FEED_QUERY);
  const [ready, setReady] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const reloadFromDb = useCallback(async (list: Post[]) => {
    const [actions, states] = await Promise.all([
      getAllActions(),
      getActionStates(),
    ]);
    setPosts(rankPosts(list, actions));
    setActionStates(states);
  }, []);

  useEffect(() => {
    setQuery(readStoredFeedQuery());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function run() {
      setRefreshing(true);
      setLoading(true);
      setErrors([]);
      try {
        const { posts: fetched, errors: nextErrors } =
          await fetchAllSubredditPosts(query, async (batch, batchErrors) => {
            if (cancelled) return;
            setErrors([...batchErrors]);
            if (batch.length === 0) return;
            await upsertPosts(batch);
            await reloadFromDb(batch);
            setLoading(false);
          });
        if (cancelled) return;
        setErrors(nextErrors);
        if (fetched.length > 0) {
          await upsertPosts(fetched);
          await reloadFromDb(fetched);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [query, ready, reloadToken, reloadFromDb]);

  const handleQueryChange = useCallback(
    (next: FeedQuery) => {
      if (next.sort === query.sort && next.period === query.period) return;
      writeStoredFeedQuery(next);
      setPosts([]);
      setQuery(next);
    },
    [query],
  );

  const handleLike = useCallback(
    async (postId: string) => {
      await setPreference(postId, "like");
      await reloadFromDb(posts);
    },
    [posts, reloadFromDb],
  );

  const handleDislike = useCallback(
    async (postId: string) => {
      await setPreference(postId, "dislike");
      await reloadFromDb(posts);
    },
    [posts, reloadFromDb],
  );

  const handleSave = useCallback(
    async (postId: string) => {
      await toggleSave(postId);
      await reloadFromDb(posts);
    },
    [posts, reloadFromDb],
  );

  const handleView = useCallback(async (postId: string) => {
    await recordView(postId);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted uppercase">
            Redditer
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">フィード</h1>
        </div>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          disabled={refreshing}
          className="min-h-12 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-60"
        >
          {refreshing ? "更新中" : "更新"}
        </button>
      </header>

      <FeedSortBar query={query} onChange={handleQueryChange} />

      {errors.length > 0 ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          一部の取得に失敗しました。取れた投稿だけ表示しています。
        </p>
      ) : null}

      {loading && posts.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-10 text-center text-sm text-muted">
          Reddit から投稿を読み込んでいます…
        </p>
      ) : (
        <PostList
          posts={posts}
          actionStates={actionStates}
          emptyMessage="表示できる投稿がまだありません。更新を押してください。"
          onLike={handleLike}
          onDislike={handleDislike}
          onSave={handleSave}
          onView={handleView}
        />
      )}
    </main>
  );
}
