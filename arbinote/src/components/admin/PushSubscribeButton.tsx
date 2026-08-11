"use client";

import { useEffect, useState } from "react";

const DEVICE_ID_KEY = "arbinote_push_device_id";

interface PushSubscriptionRecord {
  deviceId: string;
  platform: string;
  createdAt: string;
}

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

/**
 * Abonnement Web Push (alertes de vote, anomalies — voir avancement.md,
 * "Web Push généralisé"). Même mécanique que ob/src/components/PushSubscribeButton.tsx,
 * adaptée pour appeler les routes locales /api/push-subscriptions (proxy
 * fin vers notification-api, voir src/lib/notificationApi.ts) plutôt que
 * des Server Actions — convention non utilisée ailleurs dans arbinote.
 */
export function PushSubscribeButton() {
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<{ supported: boolean; deviceId: string } | null>(null);

  useEffect(() => {
    setClient({
      supported: "serviceWorker" in navigator && "PushManager" in window,
      deviceId: getOrCreateDeviceId(),
    });
    fetch("/api/push-subscriptions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setSubscriptions)
      .catch(() => {});
  }, []);

  if (!client || !client.supported) return null;

  const isThisDeviceSubscribed = subscriptions.some((sub) => sub.deviceId === client.deviceId);

  async function subscribe() {
    if (!client) return;
    setStatus(null);
    const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus("Push non configuré côté serveur (clé VAPID manquante).");
      return;
    }

    setLoading(true);
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
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: client.deviceId,
          platform: "WEB",
          endpoint: json.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        }),
      });
      if (!response.ok) throw new Error();

      setSubscriptions((prev) => [
        ...prev.filter((s) => s.deviceId !== client.deviceId),
        { deviceId: client.deviceId, platform: "WEB", createdAt: new Date().toISOString() },
      ]);
      setStatus("Notifications activées sur cet appareil.");
    } catch (error) {
      console.error(error);
      setStatus("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!client) return;
    setStatus(null);
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      await existing?.unsubscribe();
    } catch {
      // La désinscription navigateur peut échouer si déjà expirée : on retire quand même côté serveur.
    }
    try {
      await fetch(`/api/push-subscriptions/${encodeURIComponent(client.deviceId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      setSubscriptions((prev) => prev.filter((s) => s.deviceId !== client.deviceId));
      setStatus("Notifications désactivées sur cet appareil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={isThisDeviceSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className="text-sm font-medium text-gray-600 hover:text-[#c42221] border border-gray-300 hover:border-[#c42221]/40 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60"
      >
        {isThisDeviceSubscribed ? "Désactiver les notifications" : "Activer les notifications"}
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
