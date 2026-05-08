"use client";

import type { DatosMacro } from "@/lib/types";
import GlosarioTooltip from "./GlosarioTooltip";

interface Props {
  macro: DatosMacro;
}

function Indicador({
  label,
  valor,
  unidad = "",
  color = "slate",
  tooltip,
}: {
  label: string;
  valor: string | number;
  unidad?: string;
  color?: "green" | "red" | "gold" | "slate";
  tooltip?: string;
}) {
  const colorMap = {
    green: "text-green-400",
    red:   "text-red-400",
    gold:  "text-yellow-400",
    slate: "text-slate-200",
  };
  return (
    <div className="card p-3 text-center">
      <p className="text-xs text-slate-400 mb-1">
        {tooltip ? (
          <GlosarioTooltip termino={tooltip}>{label}</GlosarioTooltip>
        ) : (
          label
        )}
      </p>
      <p className={`text-lg font-bold ${colorMap[color]}`}>
        {valor}
        <span className="text-sm font-normal text-slate-400 ml-0.5">{unidad}</span>
      </p>
    </div>
  );
}

export default function IndicadoresMacro({ macro }: Props) {
  const curvaNegativa = macro.curva_rendimientos < 0;
  const inflacionAlta = macro.inflacion > 4;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Macro Actual
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Indicador
          label="Tasa 10Y"
          valor={macro.tasa_10y.toFixed(2)}
          unidad="%"
          color={macro.tasa_10y > 5 ? "red" : macro.tasa_10y > 4 ? "gold" : "green"}
        />
        <Indicador
          label="Inflación"
          valor={macro.inflacion.toFixed(1)}
          unidad="%"
          color={inflacionAlta ? "red" : macro.inflacion > 2.5 ? "gold" : "green"}
        />
        <Indicador
          label="Desempleo"
          valor={macro.desempleo.toFixed(1)}
          unidad="%"
          color={macro.desempleo > 5 ? "red" : macro.desempleo < 4 ? "green" : "gold"}
        />
        <Indicador
          label="PIB YoY"
          valor={macro.gdp_growth.toFixed(1)}
          unidad="%"
          color={macro.gdp_growth > 2 ? "green" : macro.gdp_growth > 0 ? "gold" : "red"}
        />
        <Indicador
          label="Curva 10Y-2Y"
          valor={macro.curva_rendimientos.toFixed(2)}
          unidad="%"
          color={curvaNegativa ? "red" : "green"}
          tooltip="Golden Cross"
        />
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Señal Recesión</p>
          {curvaNegativa ? (
            <span className="text-red-400 font-bold text-sm">⚠️ Alerta</span>
          ) : (
            <span className="text-green-400 font-bold text-sm">✅ Normal</span>
          )}
        </div>
      </div>
    </div>
  );
}
