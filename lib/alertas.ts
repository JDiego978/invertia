"use client";

import { guardarAlerta, obtenerAlertas, eliminarAlerta } from "./storage";
import { fetchPrecioActual } from "./dataEngine";
import type { Alerta } from "./types";

// Registrar Service Worker
export async function registrarSW(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");

    // Escuchar mensajes del SW
    navigator.serviceWorker.addEventListener("message", async (e) => {
      if (e.data?.tipo === "NECESITO_ALERTAS") {
        await verificarTodasLasAlertas();
      }
    });
  } catch (err) {
    console.warn("SW no registrado:", err);
  }
}

// Pedir permiso de notificaciones
export async function pedirPermiso(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Verificar todas las alertas activas
export async function verificarTodasLasAlertas(): Promise<void> {
  const alertas = await obtenerAlertas();
  const activas = alertas.filter((a) => a.activa);
  if (activas.length === 0) return;

  const tickers = [...new Set(activas.map((a) => a.ticker))];

  for (const ticker of tickers) {
    const precio = await fetchPrecioActual(ticker);
    if (precio === null) continue;

    for (const alerta of activas.filter((a) => a.ticker === ticker)) {
      const disparada = evaluar(alerta, precio);
      if (disparada) {
        await dispararNotificacion(alerta, precio);
        // Marcar como disparada (desactivar)
        await guardarAlerta({
          ...alerta,
          activa: false,
          disparada: new Date().toISOString(),
        });
      }
    }
  }
}

function evaluar(alerta: Alerta, precioActual: number): boolean {
  switch (alerta.tipo) {
    case "precio_sube":
      return precioActual >= alerta.valor;
    case "precio_baja":
      return precioActual <= alerta.valor;
    default:
      return false;
  }
}

async function dispararNotificacion(alerta: Alerta, valor: number): Promise<void> {
  const labels: Record<string, string> = {
    rsi_alto:    `RSI superó ${alerta.valor}`,
    rsi_bajo:    `RSI bajó a ${alerta.valor}`,
    precio_sube: `Precio alcanzó $${valor.toFixed(2)}`,
    precio_baja: `Precio cayó a $${valor.toFixed(2)}`,
    fear_greed:  `Fear & Greed llegó a ${alerta.valor}`,
  };

  const sw = await navigator.serviceWorker.ready;
  sw.active?.postMessage({
    tipo: "DISPARAR_NOTIFICACION",
    ticker: alerta.ticker,
    titulo: `Alerta: ${alerta.ticker}`,
    cuerpo: labels[alerta.tipo] ?? "Condición cumplida",
  });
}

// Crear alerta
export async function crearAlerta(
  ticker: string,
  tipo: Alerta["tipo"],
  valor: number
): Promise<void> {
  await guardarAlerta({
    id: `alerta-${Date.now()}`,
    ticker,
    tipo,
    valor,
    activa: true,
    creada: new Date().toISOString(),
  });
}

// Iniciar verificación periódica (cada 30 min)
let intervalo: ReturnType<typeof setInterval> | null = null;

export function iniciarVerificacionPeriodica(): void {
  if (intervalo) return;
  intervalo = setInterval(verificarTodasLasAlertas, 30 * 60 * 1000);
  // Primera verificación inmediata
  verificarTodasLasAlertas();
}
