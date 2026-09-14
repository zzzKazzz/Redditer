export function formatRelativeTime(createdAt: number): string {
  const createdMs = createdAt * 1000;
  const diffSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));

  if (diffSec < 60) return "たった今";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(createdMs).toLocaleDateString("ja-JP");
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
