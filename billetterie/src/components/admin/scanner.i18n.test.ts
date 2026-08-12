import { createElement, type ComponentType, type PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey, TranslationValues } from "@/i18n/dictionaries";

function ArabicState({ translationKey, values }: { translationKey: TranslationKey; values?: TranslationValues }) {
  const { t } = useI18n();
  return createElement("p", { dir: "rtl" }, t(translationKey, values));
}

function renderArabic(translationKey: TranslationKey, values?: TranslationValues) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider as ComponentType<PropsWithChildren<{ locale: "ar" }>>,
      { locale: "ar" },
      createElement(ArabicState, { translationKey, values }),
    ),
  );
}

describe("états arabes du scanner", () => {
  it("rend le refus de la caméra", () => {
    expect(renderArabic("scanner.camera.denied")).toContain("تم رفض الوصول إلى الكاميرا");
  });

  it("rend le manifeste téléchargé avec ses valeurs interpolées", () => {
    const markup = renderArabic("scanner.manifest.loaded", { match: "الترجي – النادي", count: 12, date: "12‏/08‏/2026" });
    expect(markup).toContain("تم تحميل القائمة");
    expect(markup).toContain("12");
  });

  it("rend un scan accepté", () => {
    expect(renderArabic("scanner.result.success")).toContain("الدخول مسموح");
  });

  it("rend un billet déjà scanné", () => {
    expect(renderArabic("scanner.result.alreadyUsed")).toContain("تم مسح التذكرة مسبقاً");
  });

  it("rend un échec de synchronisation avec les compteurs interpolés", () => {
    const markup = renderArabic("scanner.sync.failed", { synced: 2, failed: 1 });
    expect(markup).toContain("تمت مزامنة 2");
    expect(markup).toContain("وفشلت 1");
  });
});
