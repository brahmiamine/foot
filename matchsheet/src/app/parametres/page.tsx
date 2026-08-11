import { headers } from "next/headers";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";
import { fetchPushSubscriptions } from "@/lib/notificationClient";

export const dynamic = "force-dynamic";

/**
 * Page de réglages personnels — protégée comme les pages de feuille de
 * match (voir src/middleware.ts, qui exempte uniquement "/"). Pour
 * l'instant, uniquement l'abonnement aux notifications push.
 */
export default async function ParametresPage() {
  const requestHeaders = await headers();
  const userName = requestHeaders.get("x-sso-name");

  let subscriptions: Awaited<ReturnType<typeof fetchPushSubscriptions>> = [];
  let unavailable = false;
  try {
    subscriptions = await fetchPushSubscriptions();
  } catch {
    unavailable = true;
  }

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 520 }}>
      <h1 className="h4 mb-1">Réglages</h1>
      {userName && <p className="text-muted small mb-4">Connecté en tant que {userName}</p>}

      <div className="card">
        <div className="card-body">
          <h2 className="h5">Notifications push</h2>
          <p className="text-muted small mb-3">
            Recevez une alerte directement sur cet appareil (feuilles de match clôturées, convocations d&apos;officiels).
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
