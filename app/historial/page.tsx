"use client";

import { useState, useEffect } from "react";
import { obtenerHistorial, eliminarAnalisis, guardarAnalisis } from "@/lib/storage";
import type { ResultadoAnalisis, Oportunidad } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Análisis" },
  { href: "/historial", label: "Historial" },
  { href: "/portafolio", label: "Portafolio" },
  { href: "/precision", label: "Precisión 🎯" },
  { href: "/aprender", label: "Aprender" },
];

function FilaComparacion({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
      <td className="px-3 py-2 text-xs text-slate-400 font-medium w-36">{label}</td>
      <td className="px-3 py-2 text-sm text-center">{a}</td>
      <td className="px-3 py-2 text-sm text-center">{b}</td>
    </tr>
  );
}

function ComparacionAnalisis({
  a,
  b,
  onCerrar,
}: {
  a: ResultadoAnalisis & { id: string };
  b: ResultadoAnalisis & { id: string };
  onCerrar: () => void;
}) {
  const topA = a.oportunidades?.[0];
  const topB = b.oportunidades?.[0];

  function scoreColor(s: number) {
    return s >= 7.5 ? "text-green-400" : s >= 5.5 ? "text-yellow-400" : "text-red-400";
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <h3 className="font-semibold text-slate-100">Comparación side-by-side</h3>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-200 transition-colors">✕ Cerrar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/30">
              <th className="px-3 py-2 text-xs text-slate-400 text-left w-36">Campo</th>
              <th className="px-3 py-2 text-xs text-slate-200 text-center">
                {new Date(a.timestamp).toLocaleDateString("es-CO")}
              </th>
              <th className="px-3 py-2 text-xs text-slate-200 text-center">
                {new Date(b.timestamp).toLocaleDateString("es-CO")}
              </th>
            </tr>
          </thead>
          <tbody>
            <FilaComparacion
              label="Tipos"
              a={<span className="text-slate-300">{a.parametros.tipos.join(", ")}</span>}
              b={<span className="text-slate-300">{b.parametros.tipos.join(", ")}</span>}
            />
            <FilaComparacion
              label="País / Moneda"
              a={<span className="text-slate-300">{a.parametros.pais} / {a.parametros.moneda}</span>}
              b={<span className="text-slate-300">{b.parametros.pais} / {b.parametros.moneda}</span>}
            />
            <FilaComparacion
              label="Modo"
              a={<span className={a.parametros.modo === "profundo" ? "text-purple-300" : "text-blue-300"}>
                {a.parametros.modo === "profundo" ? "🔍 Profundo" : "⚡ Rápido"}
              </span>}
              b={<span className={b.parametros.modo === "profundo" ? "text-purple-300" : "text-blue-300"}>
                {b.parametros.modo === "profundo" ? "🔍 Profundo" : "⚡ Rápido"}
              </span>}
            />
            <FilaComparacion
              label="Oportunidades"
              a={<span className="text-slate-200 font-semibold">{a.oportunidades?.length ?? 0}</span>}
              b={<span className="text-slate-200 font-semibold">{b.oportunidades?.length ?? 0}</span>}
            />
            <FilaComparacion
              label="Ciclo económico"
              a={<span className="capitalize text-blue-300">{a.ciclo_economico?.fase ?? "—"}</span>}
              b={<span className="capitalize text-blue-300">{b.ciclo_economico?.fase ?? "—"}</span>}
            />
            {topA && topB && (
              <>
                <FilaComparacion
                  label="Top activo"
                  a={<span className="font-mono font-bold text-yellow-400">{topA.ticker}</span>}
                  b={<span className="font-mono font-bold text-yellow-400">{topB.ticker}</span>}
                />
                <FilaComparacion
                  label="Score top activo"
                  a={<span className={`font-bold ${scoreColor(topA.puntuacion_final)}`}>{topA.puntuacion_final?.toFixed(1)}</span>}
                  b={<span className={`font-bold ${scoreColor(topB.puntuacion_final)}`}>{topB.puntuacion_final?.toFixed(1)}</span>}
                />
                <FilaComparacion
                  label="Confianza top"
                  a={<span className="text-xs text-slate-300">{topA.nivel_confianza?.replace("_", " ")}</span>}
                  b={<span className="text-xs text-slate-300">{topB.nivel_confianza?.replace("_", " ")}</span>}
                />
                <FilaComparacion
                  label="RSI top"
                  a={<span className="text-slate-200">{topA.tecnico?.rsi?.toFixed(1) ?? "—"}</span>}
                  b={<span className="text-slate-200">{topB.tecnico?.rsi?.toFixed(1) ?? "—"}</span>}
                />
                <FilaComparacion
                  label="Sharpe top"
                  a={<span className={topA.cuantitativo?.sharpe > 1 ? "text-green-400" : "text-yellow-400"}>{topA.cuantitativo?.sharpe?.toFixed(2) ?? "—"}</span>}
                  b={<span className={topB.cuantitativo?.sharpe > 1 ? "text-green-400" : "text-yellow-400"}>{topB.cuantitativo?.sharpe?.toFixed(2) ?? "—"}</span>}
                />
              </>
            )}
            <FilaComparacion
              label="Resumen macro"
              a={<span className="text-xs text-slate-400 text-left block">{a.resumen_mercado?.slice(0, 80)}...</span>}
              b={<span className="text-xs text-slate-400 text-left block">{b.resumen_mercado?.slice(0, 80)}...</span>}
            />
          </tbody>
        </table>
      </div>

      {/* Todos los tickers por análisis */}
      <div className="grid grid-cols-2 gap-4 px-4 py-3 border-t border-slate-700">
        {[{ item: a, label: "Análisis A" }, { item: b, label: "Análisis B" }].map(({ item, label }) => (
          <div key={item.id}>
            <p className="text-xs font-semibold text-slate-400 mb-2">{label} — Oportunidades</p>
            <div className="flex flex-wrap gap-1.5">
              {item.oportunidades?.map((op) => (
                <span key={op.ticker} className={`badge text-xs font-mono ${
                  op.puntuacion_final >= 7.5 ? "bg-green-500/20 text-green-300" :
                  op.puntuacion_final >= 5.5 ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-red-500/20 text-red-300"
                }`}>
                  {op.ticker} {op.puntuacion_final?.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistorialPage() {
  const router = useRouter();
  const [historial, setHistorial] = useState<(ResultadoAnalisis & { id: string })[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);

  useEffect(() => {
    obtenerHistorial().then((h) => {
      setHistorial(h);
      setCargando(false);
    });
  }, []);

  async function eliminar(id: string) {
    await eliminarAnalisis(id);
    setHistorial((h) => h.filter((x) => x.id !== id));
    setSeleccionados((s) => s.filter((x) => x !== id));
  }

  async function repetir(item: ResultadoAnalisis) {
    setCargando(true);
    try {
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.parametros),
      });
      if (!res.ok) throw new Error("Error al repetir");
      const nuevo = await res.json();
      const nuevoId = await guardarAnalisis(nuevo);
      router.push(`/resultados?id=${nuevoId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
      setCargando(false);
    }
  }

  function exportarJSON(item: ResultadoAnalisis & { id: string }) {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invertia-${item.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSeleccionar(id: string) {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // máximo 2
      return [...prev, id];
    });
    setComparando(false);
  }

  const itemsSeleccionados = historial.filter((h) => seleccionados.includes(h.id));

  return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-black text-blue-400">InvertIA</a>
          <div className="flex items-center gap-1">
            {NAV.map((l) => (
              <a key={l.href} href={l.href}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-800">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-100">Historial de análisis</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{historial.length} análisis guardados</span>
            {seleccionados.length === 2 && !comparando && (
              <button
                onClick={() => setComparando(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
              >
                Comparar 2 análisis ↔
              </button>
            )}
          </div>
        </div>

        {/* Comparación side-by-side */}
        {comparando && itemsSeleccionados.length === 2 && (
          <ComparacionAnalisis
            a={itemsSeleccionados[0]}
            b={itemsSeleccionados[1]}
            onCerrar={() => setComparando(false)}
          />
        )}

        {cargando && (
          <div className="text-center py-12 text-slate-400">Cargando historial...</div>
        )}

        {!cargando && historial.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">📋</p>
            <p className="text-slate-400">Aún no tienes análisis guardados.</p>
            <a href="/" className="inline-block mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
              Hacer primer análisis
            </a>
          </div>
        )}

        {historial.length > 0 && (
          <p className="text-xs text-slate-500">
            Selecciona 2 análisis para comparar. ({seleccionados.length}/2 seleccionados)
          </p>
        )}

        <div className="space-y-3">
          {historial.map((item) => {
            const isSeleccionado = seleccionados.includes(item.id);
            return (
              <div
                key={item.id}
                className={`card p-5 transition-all ${isSeleccionado ? "border-purple-500/50 bg-purple-500/5" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox comparar */}
                  <label className="flex-shrink-0 pt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSeleccionado}
                      onChange={() => toggleSeleccionar(item.id)}
                      className="w-4 h-4 accent-purple-500"
                    />
                  </label>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-100 capitalize">
                        {item.parametros?.tipos?.join(", ") ?? "Análisis"}
                      </span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-400">{item.parametros?.pais} · {item.parametros?.moneda}</span>
                      <span className={`badge text-xs ${item.parametros?.modo === "profundo" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"}`}>
                        {item.parametros?.modo === "profundo" ? "🔍 Profundo" : "⚡ Rápido"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: es })} ·{" "}
                      {new Date(item.timestamp).toLocaleString("es-CO")}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {item.oportunidades?.slice(0, 4).map((op) => (
                        <div key={op.ticker} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5">
                          <span className="font-mono text-xs text-slate-300">{op.ticker}</span>
                          <span className={`text-xs font-bold ${
                            op.puntuacion_final >= 7.5 ? "text-green-400" :
                            op.puntuacion_final >= 5.5 ? "text-yellow-400" : "text-red-400"
                          }`}>{op.puntuacion_final?.toFixed(1)}</span>
                          <span className="text-xs text-slate-500">
                            {op.nivel_confianza === "ALTA_CONVICCION" ? "🎯" : op.nivel_confianza === "MODERADA" ? "🟡" : "🔴"}
                          </span>
                        </div>
                      ))}
                      {(item.oportunidades?.length ?? 0) > 4 && (
                        <span className="text-xs text-slate-500 self-center">+{(item.oportunidades?.length ?? 0) - 4} más</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`/resultados?id=${item.id}`}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors text-center">
                      Ver
                    </a>
                    <button onClick={() => repetir(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors">
                      Repetir
                    </button>
                    <button onClick={() => exportarJSON(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors">
                      JSON
                    </button>
                    <button onClick={() => eliminar(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
