"use client";

import { useState } from "react";
import type { AppInversion } from "@/lib/types";
import { getPais } from "@/lib/currency";

const APPS_DEFAULT: AppInversion[] = [
  {
    nombre: "Hapi",
    emoji: "📱",
    disponible_en: ["Colombia", "México", "Argentina", "Chile", "Perú", "España"],
    activos: ["Acciones US", "ETFs", "Cripto"],
    comisiones: "Sin comisiones de broker",
    minimo: "Desde $1 USD",
    mejor_para: "Principiantes en LATAM",
    regulacion: "SEC, FINRA, SIPC",
    puntuacion: 4.5,
    pros: ["Sin comisiones", "Interfaz sencilla", "Inversión mínima muy baja"],
    contras: ["Solo activos US", "Sin análisis avanzado"],
  },
  {
    nombre: "Interactive Brokers",
    emoji: "🏦",
    disponible_en: ["Colombia", "México", "Argentina", "Chile", "Perú", "Brasil", "España", "Estados Unidos"],
    activos: ["Acciones US/Global", "ETFs", "Opciones", "Futuros", "Forex", "Bonos"],
    comisiones: "$0 en acciones US (IBKR Lite)",
    minimo: "Sin mínimo",
    mejor_para: "Inversores intermedios y avanzados",
    regulacion: "SEC, FINRA, SIPC, FCA, MiFID II",
    puntuacion: 4.8,
    pros: ["Mercados globales", "Costos muy bajos", "Herramientas profesionales", "Acceso a opciones"],
    contras: ["Interfaz compleja para novatos", "Formularios detallados al abrir cuenta"],
  },
  {
    nombre: "Binance",
    emoji: "🪙",
    disponible_en: ["Colombia", "México", "Chile", "Perú", "Brasil", "España"],
    activos: ["Cripto (500+ pares)", "Futuros cripto", "Staking"],
    comisiones: "0.1% por transacción",
    minimo: "Desde $10 USD equiv.",
    mejor_para: "Inversores en cripto",
    regulacion: "Regulación varía por país",
    puntuacion: 4.2,
    pros: ["Mayor liquidez cripto", "Muchos pares", "Staking disponible"],
    contras: ["Solo cripto", "Regulación compleja en algunos países"],
  },
  {
    nombre: "Flink",
    emoji: "🇲🇽",
    disponible_en: ["México"],
    activos: ["Acciones US", "ETFs", "Cripto"],
    comisiones: "Sin comisiones",
    minimo: "Desde $10 MXN",
    mejor_para: "Inversores mexicanos principiantes",
    regulacion: "CNBV México",
    puntuacion: 4.3,
    pros: ["Regulado en México", "Inversión en pesos", "App muy intuitiva"],
    contras: ["Solo disponible en México", "Pocos activos"],
  },
  {
    nombre: "Stake",
    emoji: "🇦🇺",
    disponible_en: ["Brasil", "Chile", "Colombia"],
    activos: ["Acciones US", "ETFs"],
    comisiones: "Sin comisiones en acciones US",
    minimo: "Desde $1 USD",
    mejor_para: "Acceso a mercado US desde Latam",
    regulacion: "SEC, ASIC",
    puntuacion: 4.1,
    pros: ["Sin comisiones", "Acceso a NYSE y NASDAQ"],
    contras: ["Sin cripto", "Sin opciones"],
  },
];

interface Props {
  apps?: AppInversion[];
  pais?: string;
}

export default function AppsInversion({ apps, pais }: Props) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const listaApps = apps && apps.length > 0 ? apps : APPS_DEFAULT;

  // Resolver código ISO a nombre de país para filtrar correctamente
  const nombrePais = pais ? getPais(pais).nombre : null;

  const filtradas = nombrePais
    ? listaApps.filter((a) =>
        a.disponible_en.some((p) =>
          p.toLowerCase().includes(nombrePais.toLowerCase()) ||
          p.toLowerCase() === "global" ||
          p.toLowerCase().includes("latam")
        )
      )
    : listaApps;

  // Si el filtro dejó 0 resultados (apps de Groq no coincidieron), usar las default filtradas
  const appsFinales = filtradas.length > 0 ? filtradas : APPS_DEFAULT.filter((a) =>
    nombrePais ? a.disponible_en.some((p) => p.toLowerCase().includes(nombrePais.toLowerCase()) || p.toLowerCase() === "global") : true
  );

  const ordenadas = [...appsFinales].sort((a, b) => b.puntuacion - a.puntuacion);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Apps recomendadas ordenadas por puntuación{nombrePais ? ` disponibles en ${nombrePais}` : ""}.
      </p>
      {ordenadas.map((app) => (
        <div key={app.nombre} className="card p-4">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setExpandida(expandida === app.nombre ? null : app.nombre)}
          >
            <span className="text-2xl">{app.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100">{app.nombre}</h3>
                <span className="text-xs text-yellow-400">★ {app.puntuacion.toFixed(1)}</span>
              </div>
              <p className="text-xs text-slate-400">{app.mejor_para}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-400 font-medium">{app.comisiones}</p>
              <p className="text-xs text-slate-400">{app.minimo}</p>
            </div>
            <span className="text-slate-500 text-xs">{expandida === app.nombre ? "▲" : "▼"}</span>
          </div>

          {expandida === app.nombre && (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3 animate-fade-in">
              <div className="flex flex-wrap gap-1.5">
                {app.activos.map((a) => (
                  <span key={a} className="badge bg-blue-500/20 text-blue-300 text-xs">{a}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-slate-400">Disponible en:</span>
                {app.disponible_en.map((p) => (
                  <span key={p} className="badge bg-slate-700 text-slate-300 text-xs">{p}</span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Regulación:</span> {app.regulacion}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1">✅ Pros</p>
                  <ul className="space-y-1">
                    {app.pros.map((p, i) => (
                      <li key={i} className="text-xs text-slate-300">+ {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">❌ Contras</p>
                  <ul className="space-y-1">
                    {app.contras.map((c, i) => (
                      <li key={i} className="text-xs text-slate-300">- {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
