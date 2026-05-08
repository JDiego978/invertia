"use client";

import type { ModoAnalisis } from "@/lib/types";

interface Props {
  modo: ModoAnalisis;
  onCambiar: (modo: ModoAnalisis) => void;
  cargando?: boolean;
  onMejorar?: () => void;
}

export default function ModoAnalisisToggle({ modo, onCambiar, cargando, onMejorar }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex rounded-xl border border-slate-700 overflow-hidden">
        {(["rapido", "profundo"] as ModoAnalisis[]).map((m) => (
          <button
            key={m}
            onClick={() => onCambiar(m)}
            disabled={cargando}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              modo === m
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {m === "rapido" ? "⚡ Rápido" : "🔍 Profundo"}
          </button>
        ))}
      </div>

      {modo === "rapido" && onMejorar && (
        <button
          onClick={onMejorar}
          disabled={cargando}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
        >
          Mejorar con análisis profundo 🔍
        </button>
      )}

      <span className="text-xs text-slate-500">
        {modo === "rapido"
          ? "3 oportunidades · sin búsqueda web · ~15 seg"
          : "5 oportunidades · búsqueda web en tiempo real · ~40 seg"}
      </span>
    </div>
  );
}
