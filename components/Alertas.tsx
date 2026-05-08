"use client";

import { useState, useEffect } from "react";
import { obtenerAlertas, guardarAlerta, eliminarAlerta } from "@/lib/storage";
import { crearAlerta, pedirPermiso, registrarSW, iniciarVerificacionPeriodica } from "@/lib/alertas";
import type { Alerta } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TIPO_LABELS: Record<string, string> = {
  rsi_alto:    "RSI sube a >",
  rsi_bajo:    "RSI baja a <",
  precio_sube: "Precio sube a $",
  precio_baja: "Precio baja a $",
  fear_greed:  "Fear & Greed llega a",
};

const TIPO_ICONS: Record<string, string> = {
  rsi_alto: "📈", rsi_bajo: "📉",
  precio_sube: "💰", precio_baja: "⚠️",
  fear_greed: "🌡️",
};

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [permiso, setPermiso] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    ticker: "",
    tipo: "precio_sube" as Alerta["tipo"],
    valor: "",
  });

  useEffect(() => {
    registrarSW().then(() => iniciarVerificacionPeriodica());
    setPermiso(typeof Notification !== "undefined" && Notification.permission === "granted");
    cargarAlertas();
  }, []);

  async function cargarAlertas() {
    setAlertas(await obtenerAlertas());
  }

  async function solicitarPermiso() {
    const ok = await pedirPermiso();
    setPermiso(ok);
  }

  async function agregar() {
    if (!form.ticker || !form.valor) return;
    await crearAlerta(form.ticker.toUpperCase(), form.tipo, Number(form.valor));
    setForm({ ticker: "", tipo: "precio_sube", valor: "" });
    setMostrarForm(false);
    cargarAlertas();
  }

  async function toggleActiva(alerta: Alerta) {
    await guardarAlerta({ ...alerta, activa: !alerta.activa });
    cargarAlertas();
  }

  async function borrar(id: string) {
    await eliminarAlerta(id);
    cargarAlertas();
  }

  const activas = alertas.filter((a) => a.activa);
  const historial = alertas.filter((a) => !a.activa && a.disparada);

  return (
    <div className="space-y-5">
      {/* Permiso */}
      {!permiso && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-yellow-300">
            🔔 Activa las notificaciones para recibir alertas aunque tengas el navegador en segundo plano.
          </p>
          <button
            onClick={solicitarPermiso}
            className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition-colors flex-shrink-0"
          >
            Activar
          </button>
        </div>
      )}

      {/* Alertas activas */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-100">
            Alertas activas
            {activas.length > 0 && (
              <span className="ml-2 badge bg-blue-500/20 text-blue-300 text-xs">{activas.length}</span>
            )}
          </h3>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="badge bg-blue-500/20 text-blue-300 text-sm cursor-pointer hover:bg-blue-500/30 transition-colors"
          >
            + Nueva alerta
          </button>
        </div>

        {/* Formulario nueva alerta */}
        {mostrarForm && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                placeholder="Ticker (ej: AAPL)"
                value={form.ticker}
                onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500 font-mono"
              />
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as Alerta["tipo"] }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              >
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{TIPO_ICONS[k]} {v}...</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Valor umbral"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              Ej: AAPL · precio_baja · 180 → notificarás si Apple cae a $180
            </p>
            <div className="flex gap-2">
              <button
                onClick={agregar}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Guardar alerta
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {activas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-3xl mb-2">🔔</p>
            <p>Sin alertas activas. Crea una para recibir notificaciones automáticas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {activas.map((alerta) => (
              <div key={alerta.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors">
                <span className="text-xl">{TIPO_ICONS[alerta.tipo]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-100">{alerta.ticker}</span>
                    <span className="text-xs text-slate-400">
                      {TIPO_LABELS[alerta.tipo]} {alerta.valor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Creada {formatDistanceToNow(new Date(alerta.creada), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-green-500/20 text-green-300 text-xs">Activa</span>
                  <button
                    onClick={() => toggleActiva(alerta)}
                    className="text-xs text-slate-500 hover:text-yellow-400 transition-colors"
                    title="Pausar"
                  >
                    ⏸
                  </button>
                  <button
                    onClick={() => borrar(alerta.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial disparadas */}
      {historial.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="font-semibold text-slate-300 text-sm">Historial de alertas disparadas</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {historial.slice(0, 10).map((alerta) => (
              <div key={alerta.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                <span className="text-lg">{TIPO_ICONS[alerta.tipo]}</span>
                <div className="flex-1">
                  <span className="font-mono text-sm text-slate-300">{alerta.ticker}</span>
                  <span className="text-xs text-slate-500 ml-2">{TIPO_LABELS[alerta.tipo]} {alerta.valor}</span>
                  {alerta.disparada && (
                    <p className="text-xs text-slate-500">
                      Disparada {formatDistanceToNow(new Date(alerta.disparada), { addSuffix: true, locale: es })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => borrar(alerta.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
