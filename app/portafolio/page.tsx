"use client";

import GestionPortafolio from "@/components/GestionPortafolio";
import SimuladorRetorno from "@/components/SimuladorRetorno";
import Alertas from "@/components/Alertas";
import { useState } from "react";

type Tab = "portafolio" | "simulador" | "alertas";

const NAV = [
  { href: "/", label: "Análisis" },
  { href: "/historial", label: "Historial" },
  { href: "/portafolio", label: "Portafolio" },
  { href: "/aprender", label: "Aprender" },
];

export default function PortafolioPage() {
  const [tab, setTab] = useState<Tab>("portafolio");

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

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Portafolio, Simulador y Alertas</h1>

        <div className="flex gap-1 rounded-xl bg-slate-800 p-1 w-fit">
          {([
            { id: "portafolio", label: "📋 Mi Portafolio" },
            { id: "simulador",  label: "📈 Simulador" },
            { id: "alertas",    label: "🔔 Alertas" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "portafolio" && <GestionPortafolio />}
        {tab === "simulador"  && <SimuladorRetorno />}
        {tab === "alertas"    && <Alertas />}
      </div>
    </main>
  );
}
