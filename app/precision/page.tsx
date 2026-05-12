"use client";

import { useEffect, useState } from "react";
import { obtenerPredicciones, actualizarPrediccion } from "@/lib/storage";
import { fetchPrecioActual } from "@/lib/dataEngine";
import type { Prediccion } from "@/lib/types";

interface Metricas {
  total: number;
  verificadas: number;
  pendientes: number;
  accuracy_7d: number;
  correctas_7d: number;
  incorrectas_7d: number;
  accuracy_30d: number;
  correctas_30d: number;
  incorrectas_30d: number;
  accuracy_alta: number;
  accuracy_moderada: number;
  accuracy_baja: number;
  retorno_promedio_7d: number;
  retorno_promedio_30d: number;
  por_tipo: Record<string, { correctas: number; total: number }>;
}

function calcularMetricas(predicciones: Prediccion[]): Metricas {
  const verificadas = predicciones.filter((p) => p.resultado_7d);
  const pendientes = predicciones.filter((p) => !p.resultado_7d);

  const correctas_7d = verificadas.filter((p) => p.resultado_7d === "correcto").length;
  const incorrectas_7d = verificadas.filter((p) => p.resultado_7d === "incorrecto").length;
  const accuracy_7d = verificadas.length > 0 ? (correctas_7d / verificadas.length) * 100 : 0;

  const con30 = predicciones.filter((p) => p.resultado_30d);
  const correctas_30d = con30.filter((p) => p.resultado_30d === "correcto").length;
  const incorrectas_30d = con30.filter((p) => p.resultado_30d === "incorrecto").length;
  const accuracy_30d = con30.length > 0 ? (correctas_30d / con30.length) * 100 : 0;

  const alta = verificadas.filter((p) => p.nivel_confianza === "ALTA_CONVICCION");
  const moderada = verificadas.filter((p) => p.nivel_confianza === "MODERADA");
  const baja = verificadas.filter((p) => p.nivel_confianza === "BAJA");

  const acc = (arr: Prediccion[]) =>
    arr.length > 0 ? (arr.filter((p) => p.resultado_7d === "correcto").length / arr.length) * 100 : 0;

  const retornos_7d = verificadas
    .map((p) => p.ganancia_perdida_pct_7d ?? 0)
    .filter((v) => v !== 0);
  const retorno_promedio_7d =
    retornos_7d.length > 0 ? retornos_7d.reduce((a, b) => a + b, 0) / retornos_7d.length : 0;

  const retornos_30d = con30.map((p) => p.ganancia_perdida_pct_30d ?? 0).filter((v) => v !== 0);
  const retorno_promedio_30d =
    retornos_30d.length > 0 ? retornos_30d.reduce((a, b) => a + b, 0) / retornos_30d.length : 0;

  const por_tipo: Record<string, { correctas: number; total: number }> = {};
  for (const p of verificadas) {
    if (!por_tipo[p.tipo]) por_tipo[p.tipo] = { correctas: 0, total: 0 };
    por_tipo[p.tipo].total++;
    if (p.resultado_7d === "correcto") por_tipo[p.tipo].correctas++;
  }

  return {
    total: predicciones.length,
    verificadas: verificadas.length,
    pendientes: pendientes.length,
    accuracy_7d,
    correctas_7d,
    incorrectas_7d,
    accuracy_30d,
    correctas_30d,
    incorrectas_30d,
    accuracy_alta: acc(alta),
    accuracy_moderada: acc(moderada),
    accuracy_baja: acc(baja),
    retorno_promedio_7d,
    retorno_promedio_30d,
    por_tipo,
  };
}

function BarraProgreso({ valor, max = 100, color }: { valor: number; max?: number; color: string }) {
  const pct = Math.min((valor / max) * 100, 100);
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function colorAccuracy(acc: number) {
  if (acc >= 65) return "text-green-400";
  if (acc >= 50) return "text-yellow-400";
  return "text-red-400";
}

function labelAccuracy(acc: number) {
  if (acc >= 65) return "🟢 Buena";
  if (acc >= 50) return "🟡 Moderada";
  return "🔴 Baja";
}

export default function PrecisionPage() {
  const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [ultimaVerif, setUltimaVerif] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const preds = await obtenerPredicciones();
    setPredicciones(preds);
    setMetricas(calcularMetricas(preds));
  }

  async function verificarAhora() {
    setVerificando(true);
    const preds = await obtenerPredicciones();
    const ahora = new Date();

    for (const pred of preds) {
      const dias = (ahora.getTime() - new Date(pred.fecha_prediccion).getTime()) / 86400000;
      let actualizado = false;

      if (dias >= 7 && !pred.resultado_7d) {
        const precio = await fetchPrecioActual(pred.ticker);
        if (precio) {
          const cambio = ((precio - pred.precio_al_predecir) / pred.precio_al_predecir) * 100;
          const dir_real = cambio > 2 ? "alcista" : cambio < -2 ? "bajista" : "neutral";
          pred.precio_a_7_dias = precio;
          pred.ganancia_perdida_pct_7d = parseFloat(cambio.toFixed(2));
          pred.resultado_7d = dir_real === pred.prediccion_direccion ? "correcto" : "incorrecto";
          pred.fecha_verificacion_7d = ahora.toISOString();
          actualizado = true;
        }
      }

      if (dias >= 30 && !pred.resultado_30d) {
        const precio = await fetchPrecioActual(pred.ticker);
        if (precio) {
          const cambio = ((precio - pred.precio_al_predecir) / pred.precio_al_predecir) * 100;
          const dir_real = cambio > 2 ? "alcista" : cambio < -2 ? "bajista" : "neutral";
          pred.precio_a_30_dias = precio;
          pred.ganancia_perdida_pct_30d = parseFloat(cambio.toFixed(2));
          pred.resultado_30d = dir_real === pred.prediccion_direccion ? "correcto" : "incorrecto";
          pred.fecha_verificacion_30d = ahora.toISOString();
          actualizado = true;
        }
      }

      if (actualizado) await actualizarPrediccion(pred);
    }

    setUltimaVerif(ahora.toLocaleTimeString("es"));
    setVerificando(false);
    cargar();
  }

  if (!metricas) return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Cargando...</div>
    </main>
  );

  return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-xl font-black text-blue-400">InvertIA</span>
          <div className="flex gap-1">
            {[
              { href: "/", label: "Análisis" },
              { href: "/historial", label: "Historial" },
              { href: "/portafolio", label: "Portafolio" },
              { href: "/precision", label: "Precisión 🎯" },
              { href: "/aprender", label: "Aprender" },
            ].map((l) => (
              <a key={l.href} href={l.href}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-800">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-100">🎯 Mi Precisión</h1>
            <p className="text-slate-400 text-sm mt-1">Qué tan acertado ha sido InvertIA en tus análisis reales</p>
          </div>
          <button
            onClick={verificarAhora}
            disabled={verificando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {verificando ? "Verificando..." : "🔄 Verificar ahora"}
          </button>
        </div>

        {ultimaVerif && (
          <p className="text-xs text-slate-500">Última verificación: {ultimaVerif}</p>
        )}

        {metricas.total === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-300 font-medium">Sin predicciones aún</p>
            <p className="text-slate-500 text-sm mt-1">
              Realiza análisis para comenzar a trackear la precisión del sistema
            </p>
            <a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">
              Hacer primer análisis
            </a>
          </div>
        ) : (
          <>
            {/* Cards principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total predicciones", value: metricas.total, sub: "", color: "text-slate-100" },
                { label: "Verificadas", value: metricas.verificadas, sub: "", color: "text-blue-400" },
                { label: "Pendientes", value: metricas.pendientes, sub: "(< 7 días)", color: "text-yellow-400" },
                {
                  label: "Accuracy 7d",
                  value: `${metricas.accuracy_7d.toFixed(1)}%`,
                  sub: labelAccuracy(metricas.accuracy_7d),
                  color: colorAccuracy(metricas.accuracy_7d),
                },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs text-slate-400 mb-1">{c.label}</p>
                  <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                  {c.sub && <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>}
                </div>
              ))}
            </div>

            {/* Accuracy por horizonte */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Accuracy por horizonte</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">A 7 días</span>
                      <span className={`font-bold ${colorAccuracy(metricas.accuracy_7d)}`}>
                        {metricas.accuracy_7d.toFixed(1)}%
                      </span>
                    </div>
                    <BarraProgreso valor={metricas.accuracy_7d}
                      color={metricas.accuracy_7d >= 65 ? "bg-green-500" : metricas.accuracy_7d >= 50 ? "bg-yellow-500" : "bg-red-500"} />
                    <p className="text-xs text-slate-500 mt-1">
                      {metricas.correctas_7d} correctas / {metricas.incorrectas_7d} incorrectas
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">A 30 días</span>
                      <span className={`font-bold ${colorAccuracy(metricas.accuracy_30d)}`}>
                        {metricas.accuracy_30d.toFixed(1)}%
                      </span>
                    </div>
                    <BarraProgreso valor={metricas.accuracy_30d}
                      color={metricas.accuracy_30d >= 65 ? "bg-green-500" : metricas.accuracy_30d >= 50 ? "bg-yellow-500" : "bg-red-500"} />
                    <p className="text-xs text-slate-500 mt-1">
                      {metricas.correctas_30d} correctas / {metricas.incorrectas_30d} incorrectas
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Por nivel de confianza</h3>
                <div className="space-y-3">
                  {[
                    { label: "Alta convicción (>7.5)", valor: metricas.accuracy_alta, color: "bg-green-500" },
                    { label: "Moderada (5.5–7.5)", valor: metricas.accuracy_moderada, color: "bg-yellow-500" },
                    { label: "Baja (<5.5)", valor: metricas.accuracy_baja, color: "bg-red-500" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{row.label}</span>
                        <span className="text-slate-300 font-medium">{row.valor.toFixed(1)}%</span>
                      </div>
                      <BarraProgreso valor={row.valor} color={row.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Retorno hipotético y por tipo */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Retorno si hubieras seguido todo</h3>
                <div className="space-y-3">
                  {[
                    { label: "Promedio a 7 días", valor: metricas.retorno_promedio_7d },
                    { label: "Promedio a 30 días", valor: metricas.retorno_promedio_30d },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">{r.label}</span>
                      <span className={`text-lg font-bold ${r.valor >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {r.valor >= 0 ? "+" : ""}{r.valor.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  * Hipotético. No incluye comisiones ni slippage.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Accuracy por tipo de activo</h3>
                {Object.keys(metricas.por_tipo).length === 0 ? (
                  <p className="text-slate-500 text-sm">Sin datos suficientes aún</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(metricas.por_tipo).map(([tipo, { correctas, total }]) => {
                      const acc = total > 0 ? (correctas / total) * 100 : 0;
                      return (
                        <div key={tipo}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400 capitalize">{tipo}</span>
                            <span className="text-slate-300">{acc.toFixed(0)}% ({total} pred.)</span>
                          </div>
                          <BarraProgreso valor={acc}
                            color={acc >= 65 ? "bg-green-500" : acc >= 50 ? "bg-yellow-500" : "bg-red-500"} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Historial de predicciones */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">
                Historial de predicciones ({predicciones.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700">
                      <th className="pb-2 text-left">Fecha</th>
                      <th className="pb-2 text-left">Activo</th>
                      <th className="pb-2 text-left">Dirección</th>
                      <th className="pb-2 text-left">Score</th>
                      <th className="pb-2 text-left">7d</th>
                      <th className="pb-2 text-left">30d</th>
                      <th className="pb-2 text-right">Retorno 7d</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {predicciones.slice(0, 50).map((p) => (
                      <tr key={p.id} className="text-slate-300">
                        <td className="py-2">{new Date(p.fecha_prediccion).toLocaleDateString("es")}</td>
                        <td className="py-2 font-medium">{p.ticker}</td>
                        <td className="py-2">
                          <span className={`${p.prediccion_direccion === "alcista" ? "text-green-400" : p.prediccion_direccion === "bajista" ? "text-red-400" : "text-slate-400"}`}>
                            {p.prediccion_direccion === "alcista" ? "▲" : p.prediccion_direccion === "bajista" ? "▼" : "→"} {p.prediccion_direccion}
                          </span>
                        </td>
                        <td className="py-2">{p.puntuacion_sistema.toFixed(1)}</td>
                        <td className="py-2">
                          {p.resultado_7d ? (
                            <span className={p.resultado_7d === "correcto" ? "text-green-400" : "text-red-400"}>
                              {p.resultado_7d === "correcto" ? "✓" : "✗"}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          {p.resultado_30d ? (
                            <span className={p.resultado_30d === "correcto" ? "text-green-400" : "text-red-400"}>
                              {p.resultado_30d === "correcto" ? "✓" : "✗"}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {p.ganancia_perdida_pct_7d != null ? (
                            <span className={p.ganancia_perdida_pct_7d >= 0 ? "text-green-400" : "text-red-400"}>
                              {p.ganancia_perdida_pct_7d >= 0 ? "+" : ""}{p.ganancia_perdida_pct_7d.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
