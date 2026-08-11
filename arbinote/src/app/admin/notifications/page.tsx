import AdminLogin from "@/components/admin/AdminLogin";
import { hasAdminSession } from "@/lib/adminAuth";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { fetchPushSubscriptions } from "@/lib/notificationClient";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const authenticated = await hasAdminSession();
  if (!authenticated) {
    return <AdminLogin />;
  }

  let subscriptions: Awaited<ReturnType<typeof fetchPushSubscriptions>> = [];
  let unavailable = false;
  try {
    subscriptions = await fetchPushSubscriptions();
  } catch {
    unavailable = true;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Notifications</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recevez une alerte directement sur cet appareil (nouvelles alertes de vote, messages de contact).
        </p>
      </div>
      {unavailable ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Le service de notifications est momentanément indisponible. Réessayez dans un instant.
        </p>
      ) : (
        <PushSubscribeButton initialSubscriptions={subscriptions} />
      )}
    </div>
  );
}
