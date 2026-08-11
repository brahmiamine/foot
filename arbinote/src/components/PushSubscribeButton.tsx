"use client";

import { useEffect, useState, useTransition } from "react";
import type { PushSubscriptionRecord } from "@/lib/notificationClient";
import { registerPushSubscriptionAction, removePushSubscriptionAction } from "@/app/admin/notifications/actions";

const DEVICE_ID_KEY = "arbinote_push_device_id";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function getOrCreateDeviceId(): string {
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface ClientCapabilities {
  supported: boolean;
  deviceId: string;
}

export function PushSubscribeButton({ initialSubscriptions }: { initialSubscriptions: PushSubscriptionRecord[] }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [status, setStatus] = useState<string | null>(null);
  // `window`/`navigator` n'existent pas côté serveur : ce rendu initial reste
  // volontairement neutre, mis à jour une fois monté côté client.
  const [client, setClient] = useState<ClientCapabilities | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capacités navigateur indisponibles au rendu serveur
    setClient({
      supported: "serviceWorker" in navigator && "PushManager" in window,
      deviceId: getOrCreateDeviceId(),
    });
  }, []);

  if (!client) return null;

  const isThisDeviceSubscribed = subscriptions.some((sub) => sub.deviceId === client.deviceId);

  const subscribe = async () => {
    setStatus(null);
    const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus("Push non configuré côté serveur (clé VAPID manquante).");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Autorisation refusée — activez les notifications dans les réglages du navigateur.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      const id = client.deviceId;

      startTransition(async () => {
        await registerPushSubscriptionAction({
          deviceId: id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        });
        setSubscriptions((prev) => [
          ...prev.filter((s) => s.deviceId !== id),
          { deviceId: id, platform: "WEB", createdAt: new Date().toISOString() },
        ]);
        setStatus("Notifications activées sur cet appareil.");
      });
    } catch (error) {
      console.error(error);
      setStatus("Impossible d'activer les notifications sur cet appareil.");
    }
  };

  const unsubscribe = async () => {
    setStatus(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      await existing?.unsubscribe();
    } catch {
      // La désinscription navigateur peut échouer si déjà expirée : on retire quand même côté serveur.
    }
    const id = client.deviceId;
    startTransition(async () => {
      await removePushSubscriptionAction(id);
      setSubscriptions((prev) => prev.filter((s) => s.deviceId !== id));
      setStatus("Notifications désactivées sur cet appareil.");
    });
  };

  if (!client.supported) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Ce navigateur ne prend pas en charge les notifications push.
      </p>
    );
  }

  return (
    <div>
      {isThisDeviceSubscribed ? (
        <button
          onClick={unsubscribe}
          disabled={isPending}
          className="text-sm font-medium text-gray-600 hover:text-[#c42221] border border-gray-300 hover:border-[#c42221]/40 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60"
        >
          Désactiver sur cet appareil
        </button>
      ) : (
        <button onClick={subscribe} disabled={isPending} className="btn-primary px-4 py-2">
          Activer les notifications sur cet appareil
        </button>
      )}
      {status && <p className="mt-2.5 text-sm text-gray-500 dark:text-gray-400">{status}</p>}
      {subscriptions.length > 0 && (
        <p className="mt-2.5 text-sm text-gray-400 dark:text-gray-500">
          {subscriptions.length} appareil{subscriptions.length > 1 ? "s" : ""} abonné{subscriptions.length > 1 ? "s" : ""} au
          total.
        </p>
      )}
    </div>
  );
}
