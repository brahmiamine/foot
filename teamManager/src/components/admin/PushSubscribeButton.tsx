"use client";

import { useEffect, useState } from "react";
import {
  fetchPushSubscriptionsAction,
  registerPushSubscriptionAction,
  removePushSubscriptionAction,
} from "@/app/admin/pushActions";
import { useI18n } from "@/i18n/I18nProvider";

const DEVICE_ID_KEY = "teammanager_push_device_id";

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
 * Abonnement Web Push (convocations, annonces — voir avancement.md, "Web
 * Push généralisé"). Même mécanique que ob/src/components/PushSubscribeButton.tsx,
 * via des Server Actions (app/admin/pushActions.ts) — convention déjà
 * utilisée ailleurs dans teamManager, contrairement à ob.
 */
export function PushSubscribeButton() {
  const { t } = useI18n();
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<{ supported: boolean; deviceId: string } | null>(null);

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    setClient({
      supported: typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
      deviceId,
    });
    fetchPushSubscriptionsAction()
      .then((subs) => setSubscribed(subs.some((s) => s.deviceId === deviceId)))
      .catch(() => {});
  }, []);

  if (!client || !client.supported) return null;

  async function subscribe() {
    if (!client) return;
    setStatus(null);
    const vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus(t("notifications.push.notConfigured"));
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(t("notifications.push.permissionDenied"));
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      await registerPushSubscriptionAction({
        deviceId: client.deviceId,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
      });

      setSubscribed(true);
      setStatus(t("notifications.push.enabled"));
    } catch (error) {
      console.error(error);
      setStatus(t("notifications.push.enableError"));
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
      await removePushSubscriptionAction(client.deviceId);
      setSubscribed(false);
      setStatus(t("notifications.push.disabled"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex flex-column align-items-end">
      <button type="button" onClick={subscribed ? unsubscribe : subscribe} disabled={loading} className="btn btn-outline-secondary btn-sm">
        <i className={`fas ${subscribed ? "fa-bell-slash" : "fa-bell"} me-2`} aria-hidden="true" />
        {t(subscribed ? "notifications.push.actions.disable" : "notifications.push.actions.enable")}
      </button>
      {status && <span className="text-muted small mt-1">{status}</span>}
    </div>
  );
}
