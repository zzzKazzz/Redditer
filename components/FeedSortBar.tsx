"use client";

import {
  TOP_PERIOD_LABELS,
  TOP_PERIODS,
  type FeedQuery,
  type FeedSort,
  type TopPeriod,
} from "@/lib/feed";

type Props = {
  query: FeedQuery;
  onChange: (query: FeedQuery) => void;
};

const SORTS: { id: FeedSort; label: string }[] = [
  { id: "hot", label: "Hot" },
  { id: "top", label: "Top" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-medium ${
        active ? "bg-ink text-paper" : "bg-paper text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function FeedSortBar({ query, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {SORTS.map((sort) => (
          <Chip
            key={sort.id}
            active={query.sort === sort.id}
            onClick={() => onChange({ ...query, sort: sort.id })}
          >
            {sort.label}
          </Chip>
        ))}
      </div>
      {query.sort === "top" ? (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2 pb-1">
            {TOP_PERIODS.map((period: TopPeriod) => (
              <Chip
                key={period}
                active={query.period === period}
                onClick={() => onChange({ ...query, period })}
              >
                {TOP_PERIOD_LABELS[period]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
