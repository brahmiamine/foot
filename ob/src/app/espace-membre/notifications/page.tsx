import { fetchNotifications } from "@/lib/notificationApi";
import { NotificationsList } from "@/components/NotificationsList";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mes notifications — Espace membre — Olympique de Béja",
};

async function loadNotifications() {
  try {
    const { items } = await fetchNotifications();
    return items;
  } catch {
    return null;
  }
}

export default async function NotificationsPage() {
  const items = await loadNotifications();

  if (items === null) {
    return (
      <p className={shared.empty}>
        Le service de notifications est momentanément indisponible. Réessayez dans un instant.
      </p>
    );
  }

  return <NotificationsList initialItems={items} />;
}
