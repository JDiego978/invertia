"use client";

import type { Oportunidad } from "@/lib/types";
import GlosarioTooltip from "./GlosarioTooltip";

interface Props {
  oportunidades: Oportunidad[];
  onRemover: (ticker: string) => void;
}

function Celda({ valor, color = "" }: { valor: React.ReactNode; color?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-center ${color}`}>{valor}</td>;
}

export default function TablaComparacion({ oportunidades, onRemover }: Props) {
  if (oportunidades.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">Comparación side-by-side</h3>
        <span className="text-xs text-slate-400">{oportunidades.length} activos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 min-w-32">Métrica</th>
              {oportunidades.map((op) => (
                <th key={op.ticker} className="px-3 py-2.5 text-xs font-semibold text-slate-200 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>{op.nombre}</span>
                    <span className="text-slate-500 font-mono">{op.ticker}</span>
                    <button
                      onClick={() => onRemover(op.ticker)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕ quitar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {[
              {
                label: "Puntuación",
                render: (op: Oportunidad) => (
                  <span className={`font-bold text-base ${
                    op.puntuacion_final >= 7.5 ? "text-green-400" :
                    op.puntuacion_final >= 5.5 ? "text-yellow-400" : "text-red-400"
                  }`}>{op.puntuacion_final.toFixed(1)}</span>
                ),
              },
              {
                label: "Riesgo",
                render: (op: Oportunidad) => (
                  <span className={
                    op.riesgo === "bajo" ? "text-green-400" :
                    op.riesgo === "medio" ? "text-yellow-400" : "text-red-400"
                  }>{op.riesgo}</span>
                ),
              },
              {
                label: <GlosarioTooltip termino="RSI">RSI</GlosarioTooltip>,
                render: (op: Oportunidad) => (
                  <span className={
                    op.tecnico?.rsi_señal === "sobrecomprado" ? "text-red-400" :
                    op.tecnico?.rsi_señal === "sobrevendido" ? "text-green-400" : "text-yellow-400"
                  }>{op.tecnico?.rsi?.toFixed(1) ?? "—"}</span>
                ),
              },
              {
                label: "MACD",
                render: (op: Oportunidad) => (
                  <span className={op.tecnico?.macd_señal === "alcista" ? "text-green-400" : "text-red-400"}>
                    {op.tecnico?.macd_señal ?? "—"}
                  </span>
                ),
              },
              {
                label: <GlosarioTooltip termino="Sharpe">Sharpe</GlosarioTooltip>,
                render: (op: Oportunidad) => (
                  <span className={
                    op.cuantitativo?.sharpe > 1.5 ? "text-green-400" :
                    op.cuantitativo?.sharpe > 0.5 ? "text-yellow-400" : "text-red-400"
                  }>{op.cuantitativo?.sharpe?.toFixed(2) ?? "—"}</span>
                ),
              },
              {
                label: <GlosarioTooltip termino="VaR">VaR 95%</GlosarioTooltip>,
                render: (op: Oportunidad) => (
                  <span className="text-red-400">{op.cuantitativo?.var_95?.toFixed(1) ?? "—"}%</span>
                ),
              },
              {
                label: "Win Rate",
                render: (op: Oportunidad) => (
                  <span className={op.backtest?.win_rate_pct > 55 ? "text-green-400" : "text-yellow-400"}>
                    {op.backtest?.win_rate_pct?.toFixed(0) ?? "—"}%
                  </span>
                ),
              },
              {
                label: <GlosarioTooltip termino="Kelly">Kelly %</GlosarioTooltip>,
                render: (op: Oportunidad) => (
                  <span className="text-yellow-400">{op.kelly?.porcentaje_recomendado ?? "—"}%</span>
                ),
              },
              {
                label: "Horizonte",
                render: (op: Oportunidad) => (
                  <span className="text-slate-300">{op.horizonte_recomendado ?? "—"}</span>
                ),
              },
              {
                label: "Confianza",
                render: (op: Oportunidad) => (
                  <span className={
                    op.nivel_confianza === "ALTA_CONVICCION" ? "text-green-400" :
                    op.nivel_confianza === "MODERADA" ? "text-yellow-400" : "text-red-400"
                  }>{op.nivel_confianza?.replace("_", " ") ?? "—"}</span>
                ),
              },
            ].map((fila, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{fila.label}</td>
                {oportunidades.map((op) => (
                  <Celda key={op.ticker} valor={fila.render(op)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
