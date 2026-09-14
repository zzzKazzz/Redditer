"use client";

import { useEffect, useState } from "react";
import { getAllActions, getAllPosts } from "@/lib/db";
import { getInterestSummary } from "@/lib/recommend";

function WeightList({
  title,
  items,
  prefix,
}: {
  title: string;
  items: [string, number][];
  prefix?: string;
}) {
  return (
    <section className="rounded-2xl bg-paper px-4 py-4 shadow-[0_8px_24px_rgba(31,27,22,0.06)]">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">まだありません</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map(([name, value]) => (
            <li
              key={name}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {prefix}
                {name}
              </span>
              <span className={value > 0 ? "text-accent" : "text-stone-500"}>
                {value > 0 ? `+${value}` : value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InterestsPage() {
  const [subreddits, setSubreddits] = useState<[string, number][]>([]);
  const [likedWords, setLikedWords] = useState<[string, number][]>([]);
  const [dislikedWords, setDislikedWords] = useState<[string, number][]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    async function load() {
      const [actions, posts] = await Promise.all([
        getAllActions(),
        getAllPosts(),
      ]);
      const summary = getInterestSummary(actions, posts);
      setSubreddits(summary.subreddits);
      setLikedWords(summary.likedWords);
      setDislikedWords(summary.dislikedWords);
      setEmpty(
        summary.subreddits.length === 0 &&
          summary.likedWords.length === 0 &&
          summary.dislikedWords.length === 0,
      );
    }

    void load();
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <header>
        <p className="text-xs tracking-[0.2em] text-muted uppercase">
          Redditer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">あなたの興味</h1>
      </header>

      {empty ? (
        <p className="rounded-2xl bg-paper px-4 py-10 text-center text-sm text-muted">
          Feed で評価すると、ここに好みが表示されます
        </p>
      ) : (
        <>
          <WeightList
            title="興味のある subreddit"
            items={subreddits}
            prefix="r/"
          />
          <WeightList title="興味のあるキーワード" items={likedWords} />
          <WeightList title="興味の低いキーワード" items={dislikedWords} />
        </>
      )}
    </main>
  );
}
