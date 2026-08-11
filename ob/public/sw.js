self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Olympique de Béja", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Olympique de Béja", {
      body: payload.body,
      icon: "/images/crest.png",
      badge: "/images/crest.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
