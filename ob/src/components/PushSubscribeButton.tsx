"use client";

import { useEffect, useState, useTransition } from "react";
import type { PushSubscriptionRecord } from "@/lib/notificationApi";
import { registerPushSubscriptionAction, removePushSubscriptionAction } from "@/app/espace-membre/actions";
import shared from "./shared.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const DEVICE_ID_KEY = "ob_push_device_id";

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
  const { t } = useI18n();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [status, setStatus] = useState<string | null>(null);
  // `window`/`navigator` n'existent pas côté serveur : ce rendu initial (SSR
  // et première passe d'hydratation) reste volontairement neutre, mis à jour
  // une fois monté côté client (voir l'effet ci-dessous).
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
      setStatus(t("push.notConfigured"));
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(t("push.denied"));
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
        setStatus(t("push.enabled"));
      });
    } catch (error) {
      console.error(error);
      setStatus(t("push.enableError"));
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
      setStatus(t("push.disabled"));
    });
  };

  if (!client.supported) {
    return (
      <p style={{ color: "var(--ob-text-faint)", fontSize: 14 }}>
        {t("push.unsupported")}
      </p>
    );
  }

  return (
    <div>
      {isThisDeviceSubscribed ? (
        <button className={shared.btnOutline} onClick={unsubscribe} disabled={isPending}>
          {t("push.disable")}
        </button>
      ) : (
        <button className={shared.btnPrimary} onClick={subscribe} disabled={isPending}>
          {t("push.enable")}
        </button>
      )}
      {status && <p style={{ marginTop: 10, fontSize: 13, color: "var(--ob-text-muted)" }}>{status}</p>}
      {subscriptions.length > 0 && (
        <p style={{ marginTop: 10, fontSize: 13, color: "var(--ob-text-faint)" }}>
          {t("push.devices", { count: subscriptions.length })}
        </p>
      )}
    </div>
  );
}
