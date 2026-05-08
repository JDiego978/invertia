"use client";

import type { SectorInfo } from "@/lib/types";

interface Props {
  sectores: SectorInfo[];
}

const TENDENCIA_COLOR = {
  alcista: "text-green-400",
  bajista: "text-red-400",
  lateral: "text-yellow-400",
};

const RIESGO_COLOR: Record<string, string> = {
  bajo:         "bg-green-500/20 text-green-300",
  medio:        "bg-yellow-500/20 text-yellow-300",
  alto:         "bg-red-500/20 text-red-300",
  conservador:  "bg-green-500/20 text-green-300",
  moderado:     "bg-yellow-500/20 text-yellow-300",
  agresivo:     "bg-red-500/20 text-red-300",
};

export default function SectorCards({ sectores }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sectores.map((sector) => (
        <div key={sector.sector} className="card p-5 hover:border-slate-500 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{sector.emoji}</span>
              <div>
                <h3 className="font-semibold text-slate-100">{sector.sector}</h3>
                <span className={`text-xs font-medium ${TENDENCIA_COLOR[sector.tendencia_sector] ?? "text-slate-400"}`}>
                  {sector.tendencia_sector === "alcista" ? "↗️" : sector.tendencia_sector === "bajista" ? "↘️" : "➡️"}
                  {" "}{sector.tendencia_sector}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-100">{sector.puntuacion_sector.toFixed(1)}</p>
              <span className={`badge text-xs ${RIESGO_COLOR[sector.riesgo_sector]}`}>
                {sector.riesgo_sector}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/50 px-3 py-2 mb-3">
            <p className="text-xs text-slate-400 mb-0.5">Líder del sector</p>
            <p className="text-sm font-semibold text-yellow-400">{sector.mejor_activo}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{sector.razon_lider}</p>
          </div>

          {sector.otros_destacados?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Otros destacados:</p>
              <div className="flex flex-wrap gap-1.5">
                {sector.otros_destacados.map((t) => (
                  <span key={t} className="badge bg-slate-700 text-slate-300 text-xs font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
