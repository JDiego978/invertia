"use client";

import type { ResultadoAnalisis } from "@/lib/types";

const FASE_CONFIG = {
  expansion:    { color: "text-green-400",  bg: "bg-green-400/10",  label: "Expansión",    icon: "📈" },
  pico:         { color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pico",          icon: "🏔️" },
  contraccion:  { color: "text-red-400",    bg: "bg-red-400/10",    label: "Contracción",   icon: "📉" },
  recuperacion: { color: "text-blue-400",   bg: "bg-blue-400/10",   label: "Recuperación",  icon: "🔄" },
};

export default function ResumenMercado({ resultado }: { resultado: ResultadoAnalisis }) {
  const fase = FASE_CONFIG[resultado.ciclo_economico.fase] ?? FASE_CONFIG.expansion;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Alerta macro */}
      {resultado.alerta_macro && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-yellow-300">{resultado.alerta_macro}</p>
        </div>
      )}

      {/* Resumen + Ciclo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Contexto del mercado
          </h3>
          <p className="text-slate-200 leading-relaxed">{resultado.resumen_mercado}</p>
        </div>

        <div className={`card p-5 ${fase.bg} border-0`}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Ciclo Económico
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{fase.icon}</span>
            <span className={`text-xl font-bold ${fase.color}`}>{fase.label}</span>
          </div>
          {resultado.ciclo_economico.sectores_favorecidos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-400">Favorecidos:</p>
              <div className="flex flex-wrap gap-1">
                {resultado.ciclo_economico.sectores_favorecidos.slice(0, 3).map((s) => (
                  <span key={s} className="badge bg-green-500/20 text-green-300 text-xs">
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Desfavorecidos:</p>
              <div className="flex flex-wrap gap-1">
                {resultado.ciclo_economico.sectores_desfavorecidos.slice(0, 3).map((s) => (
                  <span key={s} className="badge bg-red-500/20 text-red-300 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
