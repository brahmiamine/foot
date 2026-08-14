import { fetchNotifications } from "@/lib/notificationApi";
import { NotificationsList } from "@/components/NotificationsList";
import shared from "@/components/shared.module.css";
import { getLocalizedMetadata, getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.notifications");

async function loadNotifications() {
  try {
    const { items } = await fetchNotifications();
    return items;
  } catch {
    return null;
  }
}

export default async function NotificationsPage() {
  const { t } = await getTranslator();
  const items = await loadNotifications();

  if (items === null) {
    return (
      <p className={shared.empty}>{t("member.serviceUnavailable")}</p>
    );
  }

  return <NotificationsList initialItems={items} />;
}
