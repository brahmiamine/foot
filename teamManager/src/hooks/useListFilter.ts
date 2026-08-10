"use client";

import { useMemo, useState } from "react";

interface UseListFilterOptions<T> {
  /** Returns the text a row should be matched against (already lower-cased is not required). */
  searchableText: (item: T) => string;
  pageSize?: number;
}

/**
 * Client-side search + pagination for admin list screens backed by a full
 * array already fetched from the server (no dedicated paginated API yet).
 */
export function useListFilter<T>(items: T[], { searchableText, pageSize = 20 }: UseListFilterOptions<T>) {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => searchableText(item).toLowerCase().includes(query));
  }, [items, search, searchableText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };

  return {
    search,
    setSearch,
    page: currentPage,
    setPage,
    totalPages,
    totalCount: filtered.length,
    items: paginated,
  };
}
