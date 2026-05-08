"use client";

import { useState } from "react";
import type { Oportunidad } from "@/lib/types";
import GlosarioTooltip from "./GlosarioTooltip";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7.5 ? "text-green-400 bg-green-400/15 border-green-400/30" :
    score >= 5.5 ? "text-yellow-400 bg-yellow-400/15 border-yellow-400/30" :
                   "text-red-400 bg-red-400/15 border-red-400/30";
  return (
    <div className={`flex items-center justify-center w-16 h-16 rounded-xl border-2 font-bold text-xl ${color}`}>
      {score.toFixed(1)}
    </div>
  );
}

function MiniMetrica({ label, valor, color = "slate" }: { label: string; valor: string; color?: string }) {
  const cmap: Record<string, string> = {
    green: "text-green-400", red: "text-red-400",
    gold: "text-yellow-400", slate: "text-slate-300",
  };
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${cmap[color] ?? cmap.slate}`}>{valor}</p>
    </div>
  );
}

function AgenteCard({ nombre, texto, icono }: { nombre: string; texto: string; icono: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <p className="text-xs font-semibold text-slate-300 mb-1">
        {icono} {nombre}
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">{texto}</p>
    </div>
  );
}

interface Props {
  oportunidad: Oportunidad;
  moneda: string;
  onToggleComparar?: (ticker: string) => void;
  enComparacion?: boolean;
}

export default function CardOportunidad({ oportunidad: op, moneda, onToggleComparar, enComparacion }: Props) {
  const [expandido, setExpandido] = useState(false);

  const tipoIcon: Record<string, string> = {
    accion: "📈", cripto: "🪙", etf: "📊",
    inmueble: "🏠", commodity: "🥇", bono: "🏦",
  };
  const riesgoColor: Record<string, string> = {
    bajo: "text-green-400 bg-green-400/10",
    medio: "text-yellow-400 bg-yellow-400/10",
    alto: "text-red-400 bg-red-400/10",
  };
  const tendenciaIcon: Record<string, string> = {
    alcista: "↗️", bajista: "↘️", lateral: "➡️",
  };

  return (
    <div className={`card p-5 transition-all duration-200 ${expandido ? "border-slate-500" : ""}`}>
      {/* Encabezado */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{tipoIcon[op.tipo] ?? "📈"}</span>
            <h3 className="font-bold text-slate-100">{op.nombre}</h3>
            <span className="text-xs text-slate-500 font-mono">{op.ticker}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`badge text-xs ${riesgoColor[op.riesgo]}`}>
              {op.riesgo === "bajo" ? "🛡️" : op.riesgo === "medio" ? "⚖️" : "🚀"} {op.riesgo}
            </span>
            <span className="badge bg-slate-700 text-slate-300 text-xs">
              {tendenciaIcon[op.tendencia]} {op.tendencia}
            </span>
            <span className={`badge text-xs ${
              op.nivel_confianza === "ALTA_CONVICCION" ? "bg-green-500/20 text-green-300" :
              op.nivel_confianza === "MODERADA" ? "bg-yellow-500/20 text-yellow-300" :
              "bg-red-500/20 text-red-300"
            }`}>
              {op.nivel_confianza === "ALTA_CONVICCION" ? "🎯" : op.nivel_confianza === "MODERADA" ? "🟡" : "🔴"}
              {" "}{op.nivel_confianza.replace("_", " ")}
            </span>
          </div>
        </div>
        <ScoreBadge score={op.puntuacion_final} />
      </div>

      {/* Señales contradictorias */}
      {op.señales_contradictorias?.length > 0 && (
        <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-xs font-semibold text-yellow-400 mb-1">⚠️ Señales contradictorias</p>
          <ul className="space-y-0.5">
            {op.señales_contradictorias.map((s, i) => (
              <li key={i} className="text-xs text-yellow-300/80">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumen */}
      <p className="text-sm text-slate-300 leading-relaxed mb-3">{op.resumen}</p>

      {/* Por qué ahora */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 mb-4">
        <p className="text-xs font-semibold text-blue-400 mb-1">💡 ¿Por qué ahora?</p>
        <p className="text-xs text-blue-300/90">{op.por_que_ahora}</p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-4 rounded-lg bg-slate-800/50 p-3">
        <MiniMetrica
          label={<GlosarioTooltip termino="Sharpe">Sharpe</GlosarioTooltip> as unknown as string}
          valor={op.cuantitativo?.sharpe?.toFixed(2) ?? "—"}
          color={op.cuantitativo?.sharpe > 1 ? "green" : op.cuantitativo?.sharpe > 0 ? "gold" : "red"}
        />
        <MiniMetrica
          label={<GlosarioTooltip termino="RSI">RSI</GlosarioTooltip> as unknown as string}
          valor={op.tecnico?.rsi?.toFixed(0) ?? "—"}
          color={op.tecnico?.rsi_señal === "sobrecomprado" ? "red" : op.tecnico?.rsi_señal === "sobrevendido" ? "green" : "gold"}
        />
        <MiniMetrica
          label={<GlosarioTooltip termino="VaR">VaR 95</GlosarioTooltip> as unknown as string}
          valor={`${op.cuantitativo?.var_95?.toFixed(1) ?? "—"}%`}
          color="red"
        />
        <MiniMetrica
          label={<GlosarioTooltip termino="PCR">PCR</GlosarioTooltip> as unknown as string}
          valor={op.opciones?.pcr?.toFixed(2) ?? "—"}
          color={op.opciones?.pcr < 0.8 ? "green" : op.opciones?.pcr > 1.2 ? "red" : "gold"}
        />
        <MiniMetrica
          label="Win Rate"
          valor={`${op.backtest?.win_rate_pct?.toFixed(0) ?? "—"}%`}
          color={op.backtest?.win_rate_pct > 55 ? "green" : op.backtest?.win_rate_pct > 50 ? "gold" : "red"}
        />
        <MiniMetrica
          label="Horizonte"
          valor={op.horizonte_recomendado ?? "—"}
          color="slate"
        />
      </div>

      {/* Kelly */}
      {op.kelly?.porcentaje_recomendado > 0 && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 mb-4">
          <p className="text-xs text-slate-400 mb-0.5">
            <GlosarioTooltip termino="Kelly">Kelly Criterion</GlosarioTooltip>
            {" "}— Tamaño óptimo de posición
          </p>
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-bold">{op.kelly.porcentaje_recomendado}%</span>
            <span className="text-slate-500 text-xs">del portafolio</span>
            {op.kelly.monto_local && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-300 text-sm font-medium">≈ {op.kelly.monto_local}</span>
              </>
            )}
          </div>
          {op.kelly.advertencia && (
            <p className="text-xs text-slate-500 mt-1">{op.kelly.advertencia}</p>
          )}
        </div>
      )}

      {/* Próximos eventos */}
      {op.eventos_futuros?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">📅 Próximos eventos</p>
          <div className="space-y-1">
            {op.eventos_futuros.slice(0, 2).map((ev, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                ev.impacto === "alto" ? "bg-red-500/10 border border-red-500/20" :
                ev.impacto === "medio" ? "bg-yellow-500/10 border border-yellow-500/20" :
                "bg-slate-800 border border-slate-700"
              }`}>
                <span className={
                  ev.impacto === "alto" ? "text-red-400" :
                  ev.impacto === "medio" ? "text-yellow-400" : "text-slate-400"
                }>
                  {ev.dias_restantes}d
                </span>
                <span className="text-slate-300">{ev.evento}</span>
                {ev.direccion_historica && (
                  <span className="text-slate-500 ml-auto">{ev.direccion_historica}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandir — 3 Agentes */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 py-1"
      >
        {expandido ? "▲ Ocultar análisis detallado" : "▼ Ver análisis completo (3 Agentes + Fundamental)"}
      </button>

      {expandido && (
        <div className="mt-4 space-y-4 animate-fade-in border-t border-slate-700 pt-4">
          {/* 3 Agentes */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Análisis 3 Agentes — Consenso: {op.consenso_agentes}
            </p>
            <div className="space-y-2">
              <AgenteCard nombre="Agente Riesgo" texto={op.agente_riesgo} icono="🛡️" />
              <AgenteCard nombre="Agente Retorno" texto={op.agente_retorno} icono="📈" />
              <AgenteCard nombre="Agente Régimen" texto={op.agente_regimen} icono="🌐" />
            </div>
          </div>

          {/* Fundamental */}
          {op.fundamental && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fundamental</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {op.fundamental.per && (
                  <div className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">PER</p>
                    <p className="font-bold text-slate-200">{op.fundamental.per?.toFixed(1)}</p>
                    {op.fundamental.per_vs_sector && (
                      <p className={`text-xs ${
                        op.fundamental.per_vs_sector === "barato" ? "text-green-400" :
                        op.fundamental.per_vs_sector === "caro" ? "text-red-400" : "text-yellow-400"
                      }`}>{op.fundamental.per_vs_sector}</p>
                    )}
                  </div>
                )}
                {op.fundamental.roe_pct && (
                  <div className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">ROE</p>
                    <p className="font-bold text-green-400">{op.fundamental.roe_pct?.toFixed(1)}%</p>
                  </div>
                )}
                {op.fundamental.deuda_equity && (
                  <div className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">Deuda/Equity</p>
                    <p className={`font-bold ${op.fundamental.deuda_equity > 2 ? "text-red-400" : "text-slate-200"}`}>
                      {op.fundamental.deuda_equity?.toFixed(2)}x
                    </p>
                  </div>
                )}
                {op.fundamental.crecimiento_ingresos_pct && (
                  <div className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">Crec. Ingresos</p>
                    <p className={`font-bold ${op.fundamental.crecimiento_ingresos_pct > 0 ? "text-green-400" : "text-red-400"}`}>
                      {op.fundamental.crecimiento_ingresos_pct?.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
              {op.fundamental.interpretacion && (
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{op.fundamental.interpretacion}</p>
              )}
            </div>
          )}

          {/* Sentimiento */}
          {op.sentimiento && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sentimiento</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <p className="text-xs text-slate-500">Noticias (NLP)</p>
                  <p className={`font-bold ${op.sentimiento.score_noticias > 20 ? "text-green-400" : op.sentimiento.score_noticias < -20 ? "text-red-400" : "text-yellow-400"}`}>
                    {op.sentimiento.score_noticias > 0 ? "+" : ""}{op.sentimiento.score_noticias?.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <p className="text-xs text-slate-500">Reddit</p>
                  <p className={`font-bold ${op.sentimiento.score_reddit > 20 ? "text-green-400" : op.sentimiento.score_reddit < -20 ? "text-red-400" : "text-yellow-400"}`}>
                    {op.sentimiento.score_reddit > 0 ? "+" : ""}{op.sentimiento.score_reddit?.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <p className="text-xs text-slate-500">Google Trends</p>
                  <p className="font-bold text-slate-200">{op.sentimiento.google_trend_score}</p>
                </div>
                {op.sentimiento.fear_greed_index !== undefined && (
                  <div className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">Fear & Greed</p>
                    <p className={`font-bold ${
                      op.sentimiento.fear_greed_index > 60 ? "text-red-400" :
                      op.sentimiento.fear_greed_index < 40 ? "text-green-400" : "text-yellow-400"
                    }`}>{op.sentimiento.fear_greed_index}</p>
                    <p className="text-xs text-slate-500">{op.sentimiento.fear_greed_label}</p>
                  </div>
                )}
              </div>
              {op.sentimiento.alerta_hype && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ Alerta hype: búsquedas en pico — riesgo de corrección por exceso de entusiasmo retail.
                </p>
              )}
            </div>
          )}

          {/* Pros y Contras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-green-400 mb-2">✅ Pros</p>
              <ul className="space-y-1">
                {op.pros?.map((p, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                    <span className="text-green-500 mt-0.5">+</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-400 mb-2">❌ Contras</p>
              <ul className="space-y-1">
                {op.contras?.map((c, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                    <span className="text-red-500 mt-0.5">-</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Backtest */}
          {op.backtest && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Backtest (2 años, estrategia RSI)
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Win Rate", valor: `${op.backtest.win_rate_pct?.toFixed(0)}%`, color: op.backtest.win_rate_pct > 55 ? "text-green-400" : "text-yellow-400" },
                  { label: "Sharpe", valor: op.backtest.sharpe_backtest?.toFixed(2), color: op.backtest.sharpe_backtest > 1 ? "text-green-400" : "text-slate-300" },
                  { label: "Max DD", valor: `${op.backtest.max_drawdown_pct?.toFixed(0)}%`, color: "text-red-400" },
                  { label: "Validada", valor: op.backtest.señal_validada ? "✅ Sí" : "❌ No", color: op.backtest.señal_validada ? "text-green-400" : "text-red-400" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-slate-800 p-2 text-center">
                    <p className="text-xs text-slate-500">{m.label}</p>
                    <p className={`text-sm font-bold ${m.color}`}>{m.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portafolio sugerido */}
          {op.porcentaje_portafolio_sugerido && (
            <p className="text-xs text-slate-400 text-center">
              Porcentaje sugerido del portafolio:{" "}
              <span className="text-yellow-400 font-semibold">{op.porcentaje_portafolio_sugerido}</span>
            </p>
          )}
        </div>
      )}

      {/* Comparar */}
      {onToggleComparar && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={enComparacion}
              onChange={() => onToggleComparar(op.ticker)}
              className="w-4 h-4 rounded accent-blue-500"
            />
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
              Añadir a comparación
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
