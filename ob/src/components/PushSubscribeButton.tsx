"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      setSupported(isSupported);
      if (!isSupported) return;

      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(!!existing);
    })();
  }, []);

  async function subscribe() {
    setError(null);
    setLoading(true);
    try {
      const keyResponse = await fetch("/api/notifications/vapid-public-key");
      if (!keyResponse.ok) throw new Error("Notifications indisponibles pour le moment.");
      const { publicKey } = await keyResponse.json();

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation refusée.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Inscription impossible.");

      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div>
      <button type="button" onClick={subscribed ? unsubscribe : subscribe} disabled={loading}>
        {subscribed ? "Désactiver les notifications" : "Activer les notifications"}
      </button>
      {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
