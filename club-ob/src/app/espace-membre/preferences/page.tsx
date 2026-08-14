import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { fetchLocale, fetchPushSubscriptions } from "@/lib/notificationApi";
import { LocaleSelector } from "@/components/LocaleSelector";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.preferences");

export default async function PreferencesPage() {
  const { t } = await getTranslator();
  let locale: Awaited<ReturnType<typeof fetchLocale>> = "fr";
  let subscriptions: Awaited<ReturnType<typeof fetchPushSubscriptions>> = [];
  let unavailable = false;

  try {
    [locale, subscriptions] = await Promise.all([fetchLocale(), fetchPushSubscriptions()]);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <p className={shared.empty}>{t("member.serviceUnavailable")}</p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
      <div className={shared.card} style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>{t("member.notificationLanguage")}</h2>
        <p style={{ color: "var(--ob-text-muted)", fontSize: 14, marginBottom: 16 }}>
          {t("member.notificationLocaleHelp")}
        </p>
        <LocaleSelector initialLocale={locale} />
      </div>

      <div className={shared.card} style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>{t("member.push")}</h2>
        <p style={{ color: "var(--ob-text-muted)", fontSize: 14, marginBottom: 16 }}>
          {t("member.pushHelp")}
        </p>
        <PushSubscribeButton initialSubscriptions={subscriptions} />
      </div>

      <p style={{ color: "var(--ob-text-faint)", fontSize: 13 }}>
        {t("member.preferencesComing")}
      </p>
    </div>
  );
}
