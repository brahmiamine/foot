"use client";

import { useTranslations } from "next-intl";

interface ListPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

export function ListPagination({ page, totalPages, onPageChange, totalCount }: ListPaginationProps) {
  const t = useTranslations("common.table");
  if (totalPages <= 1) return null;

  return (
    <nav className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" aria-label={t("pagination")}>
      <span className="text-muted small">{t("resultsCount", { count: totalCount })}</span>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            {t("previous")}
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            <button type="button" className="page-link" onClick={() => onPageChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            {t("next")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
