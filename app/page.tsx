"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import SelectorParametros from "@/components/SelectorParametros";
import { obtenerHistorial, guardarAnalisis } from "@/lib/storage";
import type { ParametrosAnalisis } from "@/lib/types";

type Vista = "dashboard" | "formulario";

export default function Home() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("dashboard");
  const [tieneHistorial, setTieneHistorial] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerHistorial().then((h) => {
      setTieneHistorial(h.length > 0);
      setVista(h.length > 0 ? "dashboard" : "formulario");
    });
  }, []);

  async function handleAnalizar(params: ParametrosAnalisis) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const resultado = await res.json();
      const id = await guardarAnalisis(resultado);
      router.push(`/resultados?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
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
            <span className="badge bg-blue-500/20 text-blue-300 text-xs">Beta</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { href: "/", label: "Análisis" },
              { href: "/historial", label: "Historial" },
              { href: "/portafolio", label: "Portafolio" },
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
        {/* Tabs dashboard/formulario */}
        {tieneHistorial && (
          <div className="flex gap-1 mb-6 rounded-xl bg-slate-800 p-1 w-fit">
            {(["dashboard", "formulario"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  vista === v
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
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
            <p className="text-xs text-red-400 mt-1">
              Verifica que tu ANTHROPIC_API_KEY esté configurada en .env.local y el servidor Python esté corriendo.
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
            <SelectorParametros onAnalizar={handleAnalizar} cargando={cargando} />

            {cargando && (
              <div className="text-center space-y-2 animate-fade-in">
                <div className="inline-flex items-center gap-3 text-slate-400 text-sm">
                  <span className="inline-block w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                  Obteniendo datos del mercado y consultando a Claude...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
