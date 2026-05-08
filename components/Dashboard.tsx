"use client";

import { useState, useEffect } from "react";
import { obtenerHistorial, obtenerAlertas } from "@/lib/storage";
import { registrarSW, iniciarVerificacionPeriodica } from "@/lib/alertas";
import type { ResultadoAnalisis } from "@/lib/types";
import type { Alerta } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  onNuevoAnalisis: () => void;
}

interface TasaCambio {
  par: string;
  valor: number;
  emoji: string;
}

export default function Dashboard({ onNuevoAnalisis }: Props) {
  const [ultimoAnalisis, setUltimoAnalisis] = useState<(ResultadoAnalisis & { id: string }) | null>(null);
  const [fearGreed, setFearGreed] = useState<{ valor: number; label: string } | null>(null);
  const [tasas, setTasas] = useState<TasaCambio[]>([]);
  const [alertasRecientes, setAlertasRecientes] = useState<Alerta[]>([]);

  useEffect(() => {
    // Historial
    obtenerHistorial().then((h) => {
      if (h.length > 0) setUltimoAnalisis(h[0]);
    });

    // Alertas recientes (disparadas)
    obtenerAlertas().then((a) => {
      setAlertasRecientes(a.filter((x) => x.disparada).slice(0, 3));
    });

    // Fear & Greed
    fetch("https://api.alternative.me/fng/")
      .then((r) => r.json())
      .then((d) => {
        setFearGreed({
          valor: parseInt(d.data[0].value),
          label: d.data[0].value_classification,
        });
      })
      .catch(() => {});

    // Tasas de cambio (sin API key, usando exchangerate gratuito)
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        if (!d.rates) return;
        setTasas([
          { par: "USD/COP", valor: Math.round(d.rates.COP), emoji: "🇨🇴" },
          { par: "USD/MXN", valor: parseFloat(d.rates.MXN.toFixed(2)), emoji: "🇲🇽" },
          { par: "USD/EUR", valor: parseFloat(d.rates.EUR.toFixed(4)), emoji: "🇪🇺" },
          { par: "USD/ARS", valor: Math.round(d.rates.ARS), emoji: "🇦🇷" },
          { par: "USD/BRL", valor: parseFloat(d.rates.BRL.toFixed(2)), emoji: "🇧🇷" },
          { par: "USD/CLP", valor: Math.round(d.rates.CLP), emoji: "🇨🇱" },
        ]);
      })
      .catch(() => {});

    // Service Worker
    registrarSW().then(() => iniciarVerificacionPeriodica());
  }, []);

  const fgColor = (v: number) =>
    v >= 75 ? "text-red-400" : v >= 55 ? "text-yellow-400" : v <= 25 ? "text-green-400" : "text-blue-400";
  const fgLabel = (v: number) =>
    v >= 75 ? "Codicia extrema" : v >= 55 ? "Codicia" : v <= 25 ? "Miedo extremo" : v <= 45 ? "Miedo" : "Neutral";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
          Bienvenido a <span className="text-blue-400">InvertIA</span>
        </h1>
        <p className="text-slate-400 mt-1">
          Análisis de inversiones con datos reales, IA Claude y modelos matemáticos verificados.
        </p>
      </div>

      {/* Fila superior: Fear&Greed + resumen portafolio */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Fear & Greed — grande y visual */}
        <div className="card p-4 text-center col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400 mb-2">🌡️ Fear & Greed</p>
          {fearGreed ? (
            <>
              <p className={`text-4xl font-black ${fgColor(fearGreed.valor)}`}>{fearGreed.valor}</p>
              <p className={`text-sm font-medium mt-1 ${fgColor(fearGreed.valor)}`}>{fgLabel(fearGreed.valor)}</p>
              {/* Barra visual */}
              <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    fearGreed.valor >= 75 ? "bg-red-500" :
                    fearGreed.valor >= 55 ? "bg-yellow-500" :
                    fearGreed.valor <= 25 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${fearGreed.valor}%` }}
                />
              </div>
            </>
          ) : (
            <div className="skeleton h-10 w-16 mx-auto rounded mt-1" />
          )}
        </div>

        {/* Último análisis */}
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-2">📅 Último análisis</p>
          {ultimoAnalisis ? (
            <>
              <p className="text-sm font-semibold text-slate-200">
                {formatDistanceToNow(new Date(ultimoAnalisis.timestamp), { addSuffix: true, locale: es })}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {ultimoAnalisis.oportunidades?.length ?? 0} oportunidades
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">Sin análisis</p>
          )}
        </div>

        {/* Mejor activo */}
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-2">🏆 Mejor score</p>
          {ultimoAnalisis?.oportunidades?.[0] ? (
            <>
              <p className="text-lg font-bold text-yellow-400">
                {ultimoAnalisis.oportunidades[0].ticker}
              </p>
              <p className={`text-sm font-bold ${
                ultimoAnalisis.oportunidades[0].puntuacion_final >= 7.5 ? "text-green-400" :
                ultimoAnalisis.oportunidades[0].puntuacion_final >= 5.5 ? "text-yellow-400" : "text-red-400"
              }`}>
                {ultimoAnalisis.oportunidades[0].puntuacion_final?.toFixed(1)} / 10
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">—</p>
          )}
        </div>

        {/* Alertas */}
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 mb-2">🔔 Alertas</p>
          {alertasRecientes.length > 0 ? (
            <>
              <p className="text-lg font-bold text-orange-400">{alertasRecientes.length}</p>
              <p className="text-xs text-orange-300">disparadas</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">Sin alertas</p>
          )}
        </div>
      </div>

      {/* Tasas de cambio */}
      {tasas.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            💱 Tasas de cambio (base USD)
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {tasas.map((t) => (
              <div key={t.par} className="text-center rounded-lg bg-slate-800 p-2">
                <p className="text-xs text-slate-500 mb-0.5">{t.emoji} {t.par}</p>
                <p className="text-sm font-bold text-slate-200">{t.valor.toLocaleString("es-CO")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 del último análisis */}
      {(ultimoAnalisis?.oportunidades?.length ?? 0) > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            🏆 Top activos del último análisis
          </h3>
          <div className="space-y-2">
            {(ultimoAnalisis?.oportunidades ?? []).slice(0, 3).map((op, i) => (
              <div key={op.ticker} className="flex items-center gap-3 rounded-lg bg-slate-800 px-3 py-2">
                <span className={`text-sm font-bold w-5 ${
                  i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : "text-yellow-700"
                }`}>
                  #{i + 1}
                </span>
                <span className="font-mono text-sm text-slate-200">{op.ticker}</span>
                <span className="text-xs text-slate-400 flex-1">{op.nombre}</span>
                <span className={`badge text-xs ${
                  op.nivel_confianza === "ALTA_CONVICCION" ? "bg-green-500/20 text-green-300" :
                  op.nivel_confianza === "MODERADA" ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-red-500/20 text-red-300"
                }`}>
                  {op.nivel_confianza?.replace("_", " ")}
                </span>
                <span className={`font-bold text-sm ${
                  op.puntuacion_final >= 7.5 ? "text-green-400" :
                  op.puntuacion_final >= 5.5 ? "text-yellow-400" : "text-red-400"
                }`}>{op.puntuacion_final?.toFixed(1)}</span>
              </div>
            ))}
          </div>
          {ultimoAnalisis && (
            <a
              href={`/resultados?id=${ultimoAnalisis.id}`}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors block text-right"
            >
              Ver análisis completo →
            </a>
          )}
        </div>
      )}

      {/* Alertas recientes disparadas */}
      {alertasRecientes.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🔔 Alertas recientes</h3>
          <div className="space-y-2">
            {alertasRecientes.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
                <span className="text-orange-400 font-mono text-sm font-bold">{a.ticker}</span>
                <span className="text-xs text-orange-300 flex-1">Alerta disparada</span>
                {a.disparada && (
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(a.disparada), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onNuevoAnalisis}
        className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white shadow-lg"
      >
        {ultimoAnalisis ? "Nuevo análisis ⚡" : "Comenzar primer análisis →"}
      </button>

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className="text-xs text-yellow-300/80 leading-relaxed">
          ⚠️ InvertIA usa datos reales de mercado, modelos matemáticos verificados académicamente e IA para
          generar análisis con fines informativos. Precisión máxima documentada: ~65-75% en condiciones normales.
          NO constituye asesoría financiera profesional. Consulta siempre a un asesor certificado antes de invertir.
        </p>
      </div>
    </div>
  );
}
