"use client";

import { PostCard } from "@/components/PostCard";
import type { ActionState, Post } from "@/lib/types";

const EMPTY_ACTIONS: ActionState = {
  like: false,
  dislike: false,
  save: false,
};

type Props = {
  posts: Post[];
  actionStates: Record<string, ActionState>;
  emptyMessage: string;
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
  onSave: (postId: string) => void;
  onView: (postId: string) => void;
};

export function PostList({
  posts,
  actionStates,
  emptyMessage,
  onLike,
  onDislike,
  onSave,
  onView,
}: Props) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl bg-paper px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          actions={actionStates[post.id] ?? EMPTY_ACTIONS}
          onLike={onLike}
          onDislike={onDislike}
          onSave={onSave}
          onView={onView}
        />
      ))}
    </div>
  );
}
