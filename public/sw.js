// InvertIA Service Worker — Alertas en background
const CACHE_NAME = "invertia-v1";
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Recibe mensajes desde la app
self.addEventListener("message", (e) => {
  if (e.data?.tipo === "VERIFICAR_ALERTAS") {
    verificarAlertas();
  }
});

// Notificación push programada (si el navegador lo soporta)
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "invertia-alertas") {
    e.waitUntil(verificarAlertas());
  }
});

async function verificarAlertas() {
  try {
    // Leer alertas desde IndexedDB vía mensaje al cliente
    const clientes = await self.clients.matchAll();
    if (clientes.length === 0) return;

    // Pedir al cliente activo que nos dé las alertas y precios
    clientes[0].postMessage({ tipo: "NECESITO_ALERTAS" });
  } catch (err) {
    console.error("[SW] Error verificando alertas:", err);
  }
}

// Recibe datos de alerta y dispara la notificación
self.addEventListener("message", async (e) => {
  if (e.data?.tipo === "DISPARAR_NOTIFICACION") {
    const { titulo, cuerpo, ticker } = e.data;
    if (Notification.permission === "granted") {
      self.registration.showNotification(`InvertIA — ${titulo}`, {
        body: cuerpo,
        icon: "/icon-192.png",
        badge: "/icon-72.png",
        tag: `alerta-${ticker}`,
        data: { url: "/" },
      });
    }
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientes) => {
      if (clientes.length > 0) {
        clientes[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});
