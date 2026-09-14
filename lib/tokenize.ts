const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "been",
  "were",
  "they",
  "this",
  "that",
  "with",
  "from",
  "your",
  "what",
  "when",
  "will",
  "about",
  "into",
  "just",
  "more",
  "some",
  "them",
  "then",
  "than",
  "also",
  "over",
  "after",
  "would",
  "could",
  "should",
  "their",
  "there",
  "these",
  "those",
  "which",
  "while",
  "where",
  "how",
  "who",
  "why",
  "its",
  "his",
  "she",
  "him",
  "does",
  "did",
  "doing",
  "don't",
  "it's",
  "i'm",
  "reddit",
  "https",
  "http",
  "www",
  "com",
]);

export function tokenizeTitle(title: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (STOPWORDS.has(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    tokens.push(raw);
  }

  return tokens;
}
