"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  previousLabel: string;
  nextLabel: string;
  pageInfoLabel: string;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  previousLabel,
  nextLabel,
  pageInfoLabel,
}: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="flex items-center justify-between gap-4 mt-8">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {previousLabel}
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed">
          {previousLabel}
        </span>
      )}

      <span className="text-sm text-gray-600 dark:text-gray-400">{pageInfoLabel}</span>

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {nextLabel}
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed">
          {nextLabel}
        </span>
      )}
    </div>
  );
}
