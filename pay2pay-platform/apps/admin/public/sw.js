/**
 * Pay2Pay Centralized Enterprise Notification Service Worker
 * Handles real-time Web Push notifications and desktop interactions.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: "Pay2Pay Notification",
      body: event.data.text() || "You have a new status update.",
    };
  }

  const title = payload.title || "Pay2Pay Alert";
  const options = {
    body: payload.body || payload.message || "A business status event has occurred.",
    icon: payload.icon || "/pay2pay-logo.png",
    badge: payload.badge || "/favicon-32x32.png",
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || payload.action_url || "/",
      ref: payload.reference_ref_id || payload.reference_number || null,
      service_type: payload.service_type || null,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "view",
        title: "View Details",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
    tag: payload.reference_ref_id || payload.tag || "pay2pay-alert",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
