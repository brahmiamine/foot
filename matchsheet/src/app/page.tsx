"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="matchsheet-empty">
      <div>
        <i className="bx bx-football text-muted mb-3 d-block" style={{ fontSize: "3rem" }} aria-hidden="true" />
        <h4 className="text-muted">{t("match.selection.title")}</h4>
        <p className="text-muted mb-0">{t("match.selection.help")}</p>
      </div>
    </div>
  );
}
