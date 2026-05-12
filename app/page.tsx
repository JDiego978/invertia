"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import SelectorParametros from "@/components/SelectorParametros";
import {
  obtenerHistorial,
  guardarAnalisis,
  guardarPrediccion,
  limiteSuperado,
  incrementarContador,
  analisisRestantes,
} from "@/lib/storage";
import type { ParametrosAnalisis, Prediccion } from "@/lib/types";

type Vista = "dashboard" | "formulario";

export default function Home() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("dashboard");
  const [tieneHistorial, setTieneHistorial] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restantesRapido, setRestantesRapido] = useState(20);
  const [restantesProfundo, setRestantesProfundo] = useState(5);
  const [segundos, setSegundos] = useState(0);
  const [pasoActual, setPasoActual] = useState(0);

  useEffect(() => {
    obtenerHistorial().then((h) => {
      setTieneHistorial(h.length > 0);
      setVista(h.length > 0 ? "dashboard" : "formulario");
    });
    setRestantesRapido(analisisRestantes("rapido"));
    setRestantesProfundo(analisisRestantes("profundo"));
  }, []);

  async function handleAnalizar(params: ParametrosAnalisis) {
    const tipo = params.modo === "profundo" ? "profundo" : "rapido";

    if (limiteSuperado(tipo)) {
      setError(`Límite diario alcanzado (${tipo === "rapido" ? 20 : 5} análisis). Resetea mañana.`);
      return;
    }

    setCargando(true);
    setError(null);
    setSegundos(0);
    setPasoActual(0);

    const timer = setInterval(() => setSegundos((s) => s + 1), 1000);
    // paso 0 = despertando, 1 = conectando, 2 = técnicos, 3 = IA, 4 = procesando
    const pasos = [0, 3, 6, 10, 14];
    const pasoTimers = pasos.map((t, i) =>
      setTimeout(() => setPasoActual(i), t * 1000)
    );

    try {
      // 1. Despertar backend (Render hiberna tras 15 min — puede tardar hasta 60s)
      const wakeRes = await fetch("/api/wake", { signal: AbortSignal.timeout(58_000) });
      if (!wakeRes.ok) {
        const w = await wakeRes.json().catch(() => ({}));
        if ((w as { status?: string }).status === "timeout") {
          throw new Error("El servidor de datos tardó demasiado en responder. Inténtalo de nuevo en 30 segundos.");
        }
      }

      // 2. Análisis real
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(58_000),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const resultado = await res.json();
      const id = await guardarAnalisis(resultado);
      incrementarContador(tipo);

      // Guardar predicciones para tracking de precisión
      for (const op of resultado.oportunidades ?? []) {
        if (op.ticker && op.puntuacion_final != null) {
          const pred: Prediccion = {
            id: `pred-${Date.now()}-${op.ticker}`,
            fecha_prediccion: new Date().toISOString(),
            ticker: op.ticker,
            tipo: op.tipo,
            nombre: op.nombre,
            precio_al_predecir: op.tecnico?.precio_actual ?? 0,
            prediccion_direccion: op.tendencia === "alcista" ? "alcista" : op.tendencia === "bajista" ? "bajista" : "neutral",
            puntuacion_sistema: op.puntuacion_final,
            nivel_confianza: op.nivel_confianza,
          };
          await guardarPrediccion(pred);
        }
      }

      setRestantesRapido(analisisRestantes("rapido"));
      setRestantesProfundo(analisisRestantes("profundo"));
      router.push(`/resultados?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      clearInterval(timer);
      pasoTimers.forEach(clearTimeout);
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-blue-400">InvertIA</span>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { href: "/", label: "Análisis" },
              { href: "/historial", label: "Historial" },
              { href: "/portafolio", label: "Portafolio" },
              { href: "/precision", label: "Precisión 🎯" },
              { href: "/aprender", label: "Aprender" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-800"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {tieneHistorial && (
          <div className="flex gap-1 mb-6 rounded-xl bg-slate-800 p-1 w-fit">
            {(["dashboard", "formulario"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vista === v ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v === "dashboard" ? "📊 Dashboard" : "🔍 Nuevo análisis"}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-300">
              <span className="font-semibold">Error: </span>{error}
            </p>
          </div>
        )}

        {vista === "dashboard" && tieneHistorial ? (
          <Dashboard onNuevoAnalisis={() => setVista("formulario")} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {!tieneHistorial && (
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-slate-100">
                  <span className="text-blue-400">InvertIA</span>
                </h1>
                <p className="text-slate-400">
                  Análisis de inversiones con datos reales, IA y modelos cuantitativos verificados.
                </p>
              </div>
            )}

            {/* Contador de análisis restantes */}
            <div className="flex gap-3 text-xs text-slate-500">
              <span>⚡ Rápidos hoy: <span className={restantesRapido <= 5 ? "text-yellow-400" : "text-slate-400"}>{restantesRapido} restantes</span></span>
              <span>·</span>
              <span>🔍 Profundos hoy: <span className={restantesProfundo <= 1 ? "text-yellow-400" : "text-slate-400"}>{restantesProfundo} restantes</span></span>
            </div>

            <SelectorParametros onAnalizar={handleAnalizar} cargando={cargando} />

            {cargando && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                {/* Barra de progreso */}
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${Math.min((segundos / 90) * 100, 95)}%` }}
                  />
                </div>
                {/* Pasos animados */}
                <div className="space-y-2">
                  {[
                    { icon: "🔌", texto: "Despertando servidor de datos..." },
                    { icon: "📡", texto: "Conectando con el mercado..." },
                    { icon: "📊", texto: "Obteniendo datos técnicos y fundamentales..." },
                    { icon: "🤖", texto: "Consultando IA para análisis de 3 agentes..." },
                    { icon: "✅", texto: "Procesando resultados..." },
                  ].map((paso, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                        i === pasoActual
                          ? "text-blue-300 font-medium"
                          : i < pasoActual
                          ? "text-slate-500 line-through"
                          : "text-slate-600"
                      }`}
                    >
                      <span>{paso.icon}</span>
                      <span>{paso.texto}</span>
                      {i === pasoActual && (
                        <span className="inline-block w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin ml-1" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-right">{segundos}s</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
