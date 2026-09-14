export const DEFAULT_SUBREDDITS = [
  "all",
  "AskReddit",
  "technology",
  "todayilearned",
  "funny",
  "worldnews",
] as const;

export const MIN_SUBSCRIPTIONS = 1;
export const MAX_SUBSCRIPTIONS = 10;

const STORAGE_KEY = "redditer.subreddits";
const NAME_RE = /^[A-Za-z0-9_]{2,21}$/;

export function normalizeSubredditName(value: string): string | null {
  const trimmed = value.trim().replace(/^\/?r\//i, "");
  if (!NAME_RE.test(trimmed)) return null;
  return trimmed;
}

export function isValidSubredditName(value: string): boolean {
  return NAME_RE.test(value);
}

export function parseStoredSubreddits(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SUBREDDITS];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = normalizeSubredditName(item);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= MAX_SUBSCRIPTIONS) break;
  }

  return names.length >= MIN_SUBSCRIPTIONS ? names : [...DEFAULT_SUBREDDITS];
}

const SERVER_SNAPSHOT: string[] = [...DEFAULT_SUBREDDITS];
const listeners = new Set<() => void>();
let clientRaw: string | null = null;
let clientSnapshot: string[] = SERVER_SNAPSHOT;

function emit() {
  for (const listener of listeners) listener();
}

export function readStoredSubreddits(): string[] {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === clientRaw) return clientSnapshot;
    clientRaw = raw;
    clientSnapshot = raw
      ? parseStoredSubreddits(JSON.parse(raw) as unknown)
      : SERVER_SNAPSHOT;
    return clientSnapshot;
  } catch {
    clientRaw = null;
    clientSnapshot = SERVER_SNAPSHOT;
    return clientSnapshot;
  }
}

export function writeStoredSubreddits(subreddits: string[]): void {
  const next = parseStoredSubreddits(subreddits);
  const serialized = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, serialized);
  clientRaw = serialized;
  clientSnapshot = next;
  emit();
}

export function subscribeSubreddits(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSubredditsServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

export function addSubscription(
  list: string[],
  input: string,
): { ok: true; list: string[] } | { ok: false; error: string } {
  const name = normalizeSubredditName(input);
  if (!name) {
    return { ok: false, error: "subreddit 名が正しくありません" };
  }
  if (list.some((item) => item.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "すでに購読しています" };
  }
  if (list.length >= MAX_SUBSCRIPTIONS) {
    return { ok: false, error: `購読は${MAX_SUBSCRIPTIONS}件までです` };
  }
  return { ok: true, list: [...list, name] };
}

export function removeSubscription(
  list: string[],
  name: string,
): { ok: true; list: string[] } | { ok: false; error: string } {
  const next = list.filter((item) => item.toLowerCase() !== name.toLowerCase());
  if (next.length === list.length) {
    return { ok: true, list };
  }
  if (next.length < MIN_SUBSCRIPTIONS) {
    return { ok: false, error: `${MIN_SUBSCRIPTIONS}件は残してください` };
  }
  return { ok: true, list: next };
}
