"use client";

import { useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatUSD, formatMonto } from "@/lib/currency";

interface PuntoGrafico {
  mes: string;
  conservador: number;
  base: number;
  optimista: number;
}

function simular(
  monto: number,
  meses: number,
  dca: boolean,
  montoDCA: number,
  retornos: { cons: number; base: number; opt: number }
): PuntoGrafico[] {
  const puntos: PuntoGrafico[] = [];
  let cons = monto, base = monto, opt = monto;
  const tConservador = retornos.cons / 12;
  const tBase = retornos.base / 12;
  const tOptimista = retornos.opt / 12;

  for (let m = 0; m <= meses; m++) {
    if (m > 0) {
      cons = cons * (1 + tConservador) + (dca ? montoDCA : 0);
      base = base * (1 + tBase) + (dca ? montoDCA : 0);
      opt  = opt  * (1 + tOptimista) + (dca ? montoDCA : 0);
    }
    puntos.push({
      mes: m === 0 ? "Hoy" : `M${m}`,
      conservador: Math.round(cons),
      base:        Math.round(base),
      optimista:   Math.round(opt),
    });
  }
  return puntos;
}

export default function SimuladorRetorno() {
  const [monto, setMonto] = useState(10000);
  const [meses, setMeses] = useState(36);
  const [dca, setDca] = useState(false);
  const [montoDCA, setMontoDCA] = useState(200);
  const [activo, setActivo] = useState("SP500");
  const [moneda, setMoneda] = useState("USD");

  const RETORNOS: Record<string, { cons: number; base: number; opt: number; label: string }> = {
    SP500:  { cons: 0.05, base: 0.10, opt: 0.18, label: "S&P 500 (histórico)" },
    NASDAQ: { cons: 0.06, base: 0.13, opt: 0.25, label: "NASDAQ 100" },
    BTC:    { cons: -0.20, base: 0.40, opt: 1.50, label: "Bitcoin" },
    ETH:    { cons: -0.15, base: 0.35, opt: 1.20, label: "Ethereum" },
    ORO:    { cons: 0.03, base: 0.07, opt: 0.15, label: "Oro (GLD)" },
    BONO:   { cons: 0.02, base: 0.04, opt: 0.07, label: "Bonos US (BND)" },
  };

  const ret = RETORNOS[activo];
  const datos = simular(monto, meses, dca, montoDCA, ret);
  const final = datos[datos.length - 1];
  const inversionTotal = monto + (dca ? montoDCA * meses : 0);

  const CustomTooltip = useCallback(({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-600 bg-slate-800 p-3 text-xs shadow-xl">
        <p className="font-semibold text-slate-200 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatUSD(p.value)}
          </p>
        ))}
      </div>
    );
  }, []);

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Simulador de Retorno</h2>
        <span className="badge bg-blue-500/20 text-blue-300 text-xs">Basado en datos históricos reales</span>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Inversión inicial (USD)</label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Período (meses)</label>
          <input
            type="range" min={6} max={120} step={6}
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            className="w-full accent-blue-500 mt-2"
          />
          <p className="text-xs text-slate-300 mt-1 text-center">{meses} meses ({(meses / 12).toFixed(1)} años)</p>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Activo de referencia</label>
          <select
            value={activo}
            onChange={(e) => setActivo(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:border-blue-500 outline-none"
          >
            {Object.entries(RETORNOS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox" checked={dca} onChange={(e) => setDca(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-xs text-slate-400">DCA mensual</span>
          </label>
          {dca && (
            <input
              type="number"
              value={montoDCA}
              onChange={(e) => setMontoDCA(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:border-blue-500 outline-none"
              placeholder="Monto mensual (USD)"
            />
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              interval={Math.floor(meses / 6)}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            />
            <Line type="monotone" dataKey="optimista"    stroke="#22c55e" strokeWidth={2} dot={false} name="Optimista (P75)" />
            <Line type="monotone" dataKey="base"         stroke="#f59e0b" strokeWidth={2} dot={false} name="Base (promedio)" />
            <Line type="monotone" dataKey="conservador"  stroke="#ef4444" strokeWidth={2} dot={false} name="Conservador (P25)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Escenario conservador", valor: final.conservador, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Escenario base", valor: final.base, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Escenario optimista", valor: final.optimista, color: "text-green-400", bg: "bg-green-500/10" },
        ].map((e) => (
          <div key={e.label} className={`rounded-xl ${e.bg} p-3 text-center`}>
            <p className="text-xs text-slate-400 mb-1">{e.label}</p>
            <p className={`text-lg font-bold ${e.color}`}>{formatUSD(e.valor)}</p>
            <p className={`text-xs ${e.color}`}>
              {((e.valor - inversionTotal) / inversionTotal * 100).toFixed(0)}% retorno
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center">
        ⚠️ Inversión total proyectada: {formatUSD(inversionTotal)} · Basado en rendimiento histórico.
        El pasado no garantiza resultados futuros.
      </p>
    </div>
  );
}
