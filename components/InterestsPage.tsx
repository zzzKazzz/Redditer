"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { getAllActions, getAllPosts } from "@/lib/db";
import { getInterestSummary } from "@/lib/recommend";
import {
  MAX_SUBSCRIPTIONS,
  addSubscription,
  getSubredditsServerSnapshot,
  readStoredSubreddits,
  removeSubscription,
  subscribeSubreddits,
  writeStoredSubreddits,
} from "@/lib/subreddits";

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

function SubscriptionEditor() {
  const subreddits = useSyncExternalStore(
    subscribeSubreddits,
    readStoredSubreddits,
    getSubredditsServerSnapshot,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function persist(next: string[]) {
    writeStoredSubreddits(next);
    setError(null);
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const result = addSubscription(subreddits, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    persist(result.list);
    setDraft("");
  }

  function handleRemove(name: string) {
    const result = removeSubscription(subreddits, name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    persist(result.list);
  }

  return (
    <section className="rounded-2xl bg-paper px-4 py-4 shadow-[0_8px_24px_rgba(31,27,22,0.06)]">
      <h2 className="text-sm font-semibold text-ink">購読中の subreddit</h2>
      <p className="mt-1 text-xs text-muted">
        {subreddits.length}/{MAX_SUBSCRIPTIONS} 件。フィードはここから取得します。
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {subreddits.map((name) => (
          <li key={name}>
            <span className="inline-flex min-h-12 items-center gap-1 rounded-full bg-accent-soft pl-4 text-sm font-medium text-accent">
              r/{name}
              <button
                type="button"
                onClick={() => handleRemove(name)}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full text-accent"
                aria-label={`r/${name} の購読をやめる`}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          placeholder="AskReddit"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-12 min-w-0 flex-1 rounded-full bg-sand px-4 text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-paper"
        >
          追加
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-amber-800">{error}</p> : null}
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

      <SubscriptionEditor />

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
