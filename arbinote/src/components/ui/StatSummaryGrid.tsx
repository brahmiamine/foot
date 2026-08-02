"use client";

import { getAccentStyles } from "@/lib/designSystem";

interface StatSummaryItem {
  label: string;
  value: number | null | undefined;
  accent?: string | null;
  description?: string | null;
  suffix?: string;
}

interface StatSummaryGridProps {
  items: StatSummaryItem[];
  className?: string;
  columnsClassName?: string;
}

export default function StatSummaryGrid({
  items,
  className = "",
  columnsClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
}: StatSummaryGridProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className={className}>
      <div className={columnsClassName}>
        {items.map((item) => {
          const accent = getAccentStyles(item.accent ?? undefined);

          return (
            <div
              key={item.label}
              className={`p-4 border rounded-lg ${accent.tile}`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {item.label}
              </div>
              <div className={`text-2xl font-semibold ${accent.text}`}>
                {typeof item.value === "number"
                  ? `${item.value.toFixed(2)}${item.suffix ?? "/5"}`
                  : "—"}
              </div>
              {item.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


