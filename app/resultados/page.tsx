"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { obtenerAnalisis } from "@/lib/storage";
import type { ResultadoAnalisis } from "@/lib/types";
import CardOportunidad from "@/components/CardOportunidad";
import TablaComparacion from "@/components/TablaComparacion";
import ResumenMercado from "@/components/ResumenMercado";
import IndicadoresMacro from "@/components/IndicadoresMacro";
import SectorCards from "@/components/SectorCards";
import AppsInversion from "@/components/AppsInversion";
import ModoAnalisisToggle from "@/components/ModoAnalisis";
import { SkeletonDashboard } from "@/components/SkeletonLoader";
import { guardarAnalisis } from "@/lib/storage";
import type { ModoAnalisis } from "@/lib/types";

type Tab = "activos" | "sectores" | "apps";

function ResultadosInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [tab, setTab] = useState<Tab>("activos");
  const [enComparacion, setEnComparacion] = useState<string[]>([]);
  const [cargandoMejora, setCargandoMejora] = useState(false);
  const [modoActual, setModoActual] = useState<ModoAnalisis>("rapido");

  useEffect(() => {
    if (!id) return;
    obtenerAnalisis(id).then((r) => {
      if (r) {
        setResultado(r);
        setModoActual(r.parametros.modo);
      }
    });
  }, [id]);

  function toggleComparar(ticker: string) {
    setEnComparacion((prev) => {
      if (prev.includes(ticker)) return prev.filter((t) => t !== ticker);
      if (prev.length >= 3) return prev;
      return [...prev, ticker];
    });
  }

  async function mejorarConProfundo() {
    if (!resultado) return;
    setCargandoMejora(true);
    try {
      const params = { ...resultado.parametros, modo: "profundo" as ModoAnalisis };
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Error al mejorar el análisis");
      const nuevo = await res.json();
      const nuevoId = await guardarAnalisis(nuevo);
      router.push(`/resultados?id=${nuevoId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setCargandoMejora(false);
    }
  }

  if (!resultado) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SkeletonDashboard />
      </div>
    );
  }

  const opEnComparacion = resultado.oportunidades.filter((o) =>
    enComparacion.includes(o.ticker)
  );
  const moneda = resultado.parametros.moneda;
  const pais = resultado.parametros.pais;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              ← Nuevo análisis
            </a>
            <span className="text-slate-600">·</span>
            <a href="/historial" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              Historial
            </a>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Resultados del análisis</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(resultado.timestamp).toLocaleString("es-CO")} · {resultado.parametros.pais} · {moneda}
          </p>
        </div>
        <ModoAnalisisToggle
          modo={modoActual}
          onCambiar={setModoActual}
          cargando={cargandoMejora}
          onMejorar={mejorarConProfundo}
        />
      </div>

      {/* Indicadores Macro */}
      {resultado.macro && <IndicadoresMacro macro={resultado.macro} />}

      {/* Resumen mercado */}
      <ResumenMercado resultado={resultado} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1 w-fit">
        {([
          { id: "activos",  label: "📊 Por Activo" },
          { id: "sectores", label: "🏭 Por Sector" },
          { id: "apps",     label: "📱 Dónde Invertir" },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-slate-700 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Comparación */}
      {enComparacion.length > 1 && (
        <TablaComparacion
          oportunidades={opEnComparacion}
          onRemover={(t) => toggleComparar(t)}
        />
      )}

      {/* Tab Activos */}
      {tab === "activos" && (
        <div className="space-y-4">
          {enComparacion.length < 3 && (
            <p className="text-xs text-slate-400">
              Selecciona hasta 3 activos para comparar side-by-side.
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resultado.oportunidades.map((op) => (
              <CardOportunidad
                key={op.ticker}
                oportunidad={op}
                moneda={moneda}
                onToggleComparar={toggleComparar}
                enComparacion={enComparacion.includes(op.ticker)}
              />
            ))}
          </div>

          {resultado.oportunidades.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>No se encontraron oportunidades. Intenta con otros parámetros.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Sectores */}
      {tab === "sectores" && (
        resultado.por_sector?.length > 0 ? (
          <SectorCards sectores={resultado.por_sector} />
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p>Sin datos de sector en este análisis.</p>
          </div>
        )
      )}

      {/* Tab Apps */}
      {tab === "apps" && (
        <AppsInversion
          apps={resultado.apps_recomendadas}
          pais={pais}
        />
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
        <p className="text-xs text-yellow-300/80 leading-relaxed">
          ⚠️ InvertIA usa datos reales de mercado, modelos matemáticos verificados académicamente e IA para
          generar este análisis con fines informativos. Precisión máxima documentada: ~65-75% en condiciones
          normales. NO constituye asesoría financiera profesional ni garantía de resultados.
        </p>
      </div>

      {/* Si está mejorando */}
      {cargandoMejora && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-8 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin mx-auto" />
            <p className="text-slate-200 font-semibold">Analizando mercado en tiempo real...</p>
            <p className="text-slate-400 text-sm">Búsqueda web activa · ~40 segundos</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-black text-blue-400">InvertIA</a>
          <div className="flex items-center gap-1">
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
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><SkeletonDashboard /></div>}>
        <ResultadosInner />
      </Suspense>
    </main>
  );
}
