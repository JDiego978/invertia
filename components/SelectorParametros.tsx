"use client";

import { useState } from "react";
import { PAISES } from "@/lib/currency";
import type { ParametrosAnalisis, TipoActivo, ModoAnalisis } from "@/lib/types";

const TIPOS: { id: TipoActivo; label: string; icon: string }[] = [
  { id: "accion",    label: "Acciones",        icon: "📈" },
  { id: "cripto",    label: "Cripto",           icon: "🪙" },
  { id: "inmueble",  label: "Bienes Raíces",   icon: "🏠" },
  { id: "commodity", label: "Commodities",      icon: "🥇" },
  { id: "etf",       label: "ETFs",             icon: "📊" },
  { id: "bono",      label: "Bonos",            icon: "🏦" },
];

const SECTORES = [
  { id: "Tecnología",          icon: "💻" },
  { id: "Salud",               icon: "🏥" },
  { id: "Finanzas",            icon: "🏦" },
  { id: "Energía",             icon: "⚡" },
  { id: "Consumo",             icon: "🛒" },
  { id: "Industria",           icon: "🏭" },
  { id: "Materias Primas",     icon: "🌾" },
  { id: "Automotriz",          icon: "🚗" },
  { id: "IA",                  icon: "🤖" },
  { id: "Energías Renovables", icon: "🌱" },
];

interface Props {
  onAnalizar: (params: ParametrosAnalisis) => void;
  cargando: boolean;
}

export default function SelectorParametros({ onAnalizar, cargando }: Props) {
  const [pais, setPais] = useState("CO");
  const [tipos, setTipos] = useState<TipoActivo[]>(["accion"]);
  const [sectores, setSectores] = useState<string[]>([]);
  const [riesgo, setRiesgo] = useState<"conservador" | "moderado" | "agresivo">("moderado");
  const [horizonte, setHorizonte] = useState<"corto" | "mediano" | "largo">("mediano");
  const [monto, setMonto] = useState<string>("");
  const [modo, setModo] = useState<ModoAnalisis>("rapido");

  const paisInfo = PAISES.find((p) => p.codigo === pais)!;

  function toggleTipo(t: TipoActivo) {
    setTipos((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }
  function toggleSector(s: string) {
    setSectores((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tipos.length === 0) return alert("Selecciona al menos un tipo de inversión");
    onAnalizar({
      pais,
      moneda: paisInfo.moneda,
      tipos,
      sectores,
      riesgo,
      horizonte,
      monto: monto ? Number(monto) : undefined,
      modo,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
      {/* País */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">País y moneda</label>
        <select
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 focus:border-blue-500 outline-none transition-colors"
        >
          {PAISES.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.bandera} {p.nombre} — {p.moneda}
            </option>
          ))}
        </select>
      </div>

      {/* Tipos */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Tipos de inversión <span className="text-slate-500 font-normal text-xs">(multiselección)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTipo(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                tipos.includes(t.id)
                  ? "border-blue-500 bg-blue-500/20 text-blue-200"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sectores */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Sectores <span className="text-slate-500 font-normal text-xs">(opcional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SECTORES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSector(s.id)}
              className={`badge cursor-pointer text-xs transition-all ${
                sectores.includes(s.id)
                  ? "bg-purple-500/25 text-purple-200 border border-purple-500/40"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              {s.icon} {s.id}
            </button>
          ))}
        </div>
      </div>

      {/* Riesgo y horizonte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Nivel de riesgo</label>
          <div className="flex gap-2">
            {(["conservador", "moderado", "agresivo"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiesgo(r)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                  riesgo === r
                    ? r === "conservador" ? "border-green-500 bg-green-500/20 text-green-300"
                    : r === "moderado"    ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                    :                      "border-red-500 bg-red-500/20 text-red-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}
              >
                {r === "conservador" ? "🛡️" : r === "moderado" ? "⚖️" : "🚀"} {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Horizonte</label>
          <div className="flex gap-2">
            {(["corto", "mediano", "largo"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonte(h)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                  horizonte === h
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}
              >
                {h === "corto" ? "<1 año" : h === "mediano" ? "1–5 años" : ">5 años"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Monto disponible{" "}
          <span className="text-slate-500 font-normal text-xs">(opcional, en {paisInfo.moneda})</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
            {paisInfo.simbolo}
          </span>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 5,000,000"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-8 pr-4 py-3 text-slate-100 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Modo */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">Modo de análisis</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              id: "rapido" as ModoAnalisis,
              label: "⚡ Modo Rápido",
              desc: "3 oportunidades · Datos del día · ~10-20 seg",
              tokens: "900 tokens",
            },
            {
              id: "profundo" as ModoAnalisis,
              label: "🔍 Modo Profundo",
              desc: "5 oportunidades · Búsqueda web en tiempo real · ~30-60 seg",
              tokens: "1600 tokens",
            },
          ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModo(m.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                modo === m.id
                  ? "border-blue-500 bg-blue-500/15"
                  : "border-slate-700 bg-slate-800 hover:border-slate-500"
              }`}
            >
              <p className={`font-semibold text-sm mb-1 ${modo === m.id ? "text-blue-200" : "text-slate-200"}`}>
                {m.label}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={cargando || tipos.length === 0}
        className="w-full py-4 rounded-xl font-bold text-base transition-all bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
      >
        {cargando ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {modo === "profundo" ? "Analizando mercado en tiempo real..." : "Calculando..."}
          </span>
        ) : (
          `Analizar ${tipos.length > 1 ? `${tipos.length} tipos` : tipos[0]} ${modo === "profundo" ? "🔍" : "⚡"}`
        )}
      </button>
    </form>
  );
}
