"use client";

import { useState } from "react";

interface TooltipData {
  que_es: string;
  como_interpretar: string;
  ejemplo: string;
}

const GLOSARIO: Record<string, TooltipData> = {
  RSI: {
    que_es: "Índice de Fuerza Relativa. Mide si un activo está sobrecomprado o sobrevendido.",
    como_interpretar: ">70 = sobrecomprado (posible caída). <30 = sobrevendido (posible rebote). 50 = neutral.",
    ejemplo: "RSI de 75 en Apple = ha subido mucho, puede haber corrección.",
  },
  MACD: {
    que_es: "Convergencia/Divergencia de Medias Móviles. Señala cambios de tendencia.",
    como_interpretar: "Alcista = la línea MACD cruza por encima de la señal. Bajista = cruza por debajo.",
    ejemplo: "MACD alcista en Tesla = tendencia positiva de corto plazo.",
  },
  Sharpe: {
    que_es: "Relación entre retorno y riesgo. Mide cuánto ganas por unidad de riesgo.",
    como_interpretar: ">1 = bueno. >2 = excelente. <0 = malo (pierdes dinero ajustado al riesgo).",
    ejemplo: "Sharpe 1.5 = por cada % de riesgo que aceptas, obtienes 1.5% de retorno extra.",
  },
  VaR: {
    que_es: "Valor en Riesgo. Pérdida máxima esperada en el 5% de los peores días.",
    como_interpretar: "VaR -4% = en el 5% de los peores días, puedes perder hasta 4% en un día.",
    ejemplo: "VaR -8% en cripto = activo muy volátil, puede perder 8% en un mal día.",
  },
  Kelly: {
    que_es: "Criterio de Kelly. Calcula qué % de tu capital invertir para maximizar retornos.",
    como_interpretar: "Usamos Half-Kelly (más seguro). Nunca más del 10% por activo.",
    ejemplo: "Kelly 5% con $10,000 = invertir $500 en ese activo.",
  },
  PCR: {
    que_es: "Ratio Put/Call. Mide el sentimiento de opciones (dinero institucional).",
    como_interpretar: ">1 = más puts (bajista, miedo). <0.7 = más calls (alcista, confianza).",
    ejemplo: "PCR 0.6 en S&P500 = institucionales apuestan al alza.",
  },
  "Golden Cross": {
    que_es: "Cruce dorado. La media de 50 días supera a la de 200 días.",
    como_interpretar: "Señal alcista de largo plazo muy respetada por institucionales.",
    ejemplo: "Golden Cross en NVDA = tendencia principal alcista establecida.",
  },
  DCF: {
    que_es: "Flujo de Caja Descontado. Valora una empresa por sus flujos futuros.",
    como_interpretar: "Infravalorada = precio actual < valor intrínseco calculado.",
    ejemplo: "DCF muestra AAPL infravalorada 15% = está 'barata' según este modelo.",
  },
  DCA: {
    que_es: "Dollar Cost Averaging. Invertir cantidades fijas en intervalos regulares.",
    como_interpretar: "Reduce el riesgo de entrar en máximos. Ideal para largo plazo.",
    ejemplo: "DCA $200/mes en ETF durante 3 años = reduces el impacto de la volatilidad.",
  },
  PEG: {
    que_es: "Price/Earnings to Growth. Compara el PER con el crecimiento esperado.",
    como_interpretar: "<1 = potencialmente barata. >2 = potencialmente cara.",
    ejemplo: "PEG 0.8 en empresa tecnológica = crecimiento justifica la valoración.",
  },
};

interface Props {
  termino: string;
  children: React.ReactNode;
}

export default function GlosarioTooltip({ termino, children }: Props) {
  const [visible, setVisible] = useState(false);
  const data = GLOSARIO[termino];

  if (!data) return <>{children}</>;

  return (
    <span className="relative inline-flex items-center gap-1 group">
      {children}
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={`Más información sobre ${termino}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <text x="8" y="12" textAnchor="middle" fontSize="9" fill="currentColor">?</text>
        </svg>
      </button>

      {visible && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-2xl text-sm animate-fade-in">
          <p className="font-semibold text-slate-100 mb-1">{termino}</p>
          <p className="text-slate-300 mb-2">{data.que_es}</p>
          <p className="text-slate-400 text-xs mb-2">
            <span className="text-blue-400 font-medium">Cómo interpretar: </span>
            {data.como_interpretar}
          </p>
          <p className="text-slate-500 text-xs italic">Ej: {data.ejemplo}</p>
        </div>
      )}
    </span>
  );
}
