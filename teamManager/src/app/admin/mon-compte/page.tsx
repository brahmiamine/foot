import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { fetchPushSubscriptions } from "@/lib/notificationClient";

export const dynamic = "force-dynamic";

/** Page personnelle du compte connecté — pour l'instant, uniquement l'abonnement aux notifications push. */
export default async function MonComptePage() {
  const session = await auth();
  if (!session) redirect("/admin");

  let subscriptions: Awaited<ReturnType<typeof fetchPushSubscriptions>> = [];
  let unavailable = false;
  try {
    subscriptions = await fetchPushSubscriptions();
  } catch {
    unavailable = true;
  }

  return (
    <div className="container-fluid px-0 skote-settings-narrow">
      <h1 className="h4 mb-1">Mon compte</h1>
      <p className="text-muted small mb-4">{session.user.name ?? session.user.email}</p>

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Notifications push</h2>
          <p className="text-muted small mb-3">
            Recevez une alerte directement sur cet appareil (convocations, actualités, communiqués du club).
          </p>
          {unavailable ? (
            <p className="text-muted small mb-0">
              Le service de notifications est momentanément indisponible. Réessayez dans un instant.
            </p>
          ) : (
            <PushSubscribeButton initialSubscriptions={subscriptions} />
          )}
        </div>
      </div>
    </div>
  );
}
