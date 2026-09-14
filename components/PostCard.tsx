"use client";

import { useEffect, useRef } from "react";
import { formatCount, formatRelativeTime } from "@/lib/format";
import type { ActionState, Post } from "@/lib/types";

type Props = {
  post: Post;
  actions: ActionState;
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
  onSave: (postId: string) => void;
  onView: (postId: string) => void;
};

function redditUrl(post: Post): string {
  return `https://www.reddit.com${post.permalink}`;
}

export function PostCard({
  post,
  actions,
  onLike,
  onDislike,
  onSave,
  onView,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const viewed = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || viewed.current) return;
        viewed.current = true;
        onView(post.id);
      },
      { threshold: 0.55 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onView, post.id]);

  return (
    <article
      ref={ref}
      className="overflow-hidden rounded-2xl bg-paper shadow-[0_8px_24px_rgba(31,27,22,0.06)]"
    >
      <a
        href={redditUrl(post)}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-4 pt-4 pb-3"
      >
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="font-medium text-accent">r/{post.subreddit}</span>
          <time dateTime={new Date(post.createdAt * 1000).toISOString()}>
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>
        <h2 className="mt-2 text-base leading-snug font-semibold text-ink">
          {post.title}
        </h2>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 max-h-72 w-full rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
        {post.selftext ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
            {post.selftext}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          ↑ {formatCount(post.score)}　コメント {formatCount(post.comments)}
        </p>
      </a>

      <div className="grid grid-cols-3 gap-1 border-t border-stone-200/80 p-2">
        <button
          type="button"
          onClick={() => onLike(post.id)}
          className={`min-h-12 rounded-xl text-sm font-medium ${
            actions.like
              ? "bg-accent text-white"
              : "bg-accent-soft text-accent"
          }`}
        >
          👍 興味あり
        </button>
        <button
          type="button"
          onClick={() => onDislike(post.id)}
          className={`min-h-12 rounded-xl text-sm font-medium ${
            actions.dislike
              ? "bg-stone-700 text-white"
              : "bg-stone-100 text-dislike"
          }`}
        >
          👎 興味なし
        </button>
        <button
          type="button"
          onClick={() => onSave(post.id)}
          className={`min-h-12 rounded-xl text-sm font-medium ${
            actions.save
              ? "bg-amber-700 text-white"
              : "bg-amber-50 text-save"
          }`}
        >
          🔖 保存
        </button>
      </div>
    </article>
  );
}
