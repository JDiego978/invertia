"use client";

import { useState } from "react";

type Nivel = "basico" | "intermedio" | "avanzado";

const CONTENIDO: Record<Nivel, { titulo: string; temas: { nombre: string; icon: string; contenido: string[] }[] }> = {
  basico: {
    titulo: "Básico — Primeros pasos",
    temas: [
      {
        nombre: "¿Qué son las acciones?",
        icon: "📈",
        contenido: [
          "Una acción es una fracción de propiedad de una empresa. Si compras 1 acción de Apple, eres dueño de una pequeña parte de Apple.",
          "Las acciones suben cuando la empresa gana más dinero del esperado, y bajan cuando decepciona.",
          "Ejemplo: Si compras 10 acciones de NVDA a $100 c/u ($1,000) y suben a $150, tienes $1,500 (ganancia del 50%).",
          "Riesgo: Las acciones pueden caer a $0 si la empresa quiebra. Por eso es clave diversificar.",
        ],
      },
      {
        nombre: "¿Qué son los ETFs?",
        icon: "📊",
        contenido: [
          "Un ETF (Exchange-Traded Fund) es una canasta de acciones que puedes comprar como si fuera una sola acción.",
          "SPY = las 500 empresas más grandes de EEUU. Con $1, inviertes en Apple, Microsoft, Amazon y 497 más.",
          "Son más seguros que las acciones individuales porque si una empresa cae, las otras pueden compensar.",
          "Ideal para principiantes: QQQ (tecnología), SPY (mercado total), VTI (todo el mercado US).",
        ],
      },
      {
        nombre: "Diversificación",
        icon: "🎯",
        contenido: [
          "La regla más importante de la inversión: 'No pongas todos los huevos en una canasta'.",
          "Un portafolio diversificado tiene acciones de diferentes sectores, países y tipos de activo.",
          "Ejemplo: 50% ETF mercado total + 20% ETF bonos + 20% cripto + 10% oro.",
          "Con diversificación, si cripto cae 50%, tu portafolio total solo cae ~10%. Sin ella, caes 50%.",
        ],
      },
      {
        nombre: "DCA — Dollar Cost Averaging",
        icon: "🔄",
        contenido: [
          "DCA = invertir una cantidad fija cada mes sin importar si el mercado sube o baja.",
          "Ejemplo: Inviertes $200 en SPY cada mes. En meses de caída compras más unidades (barato). En meses de subida compras menos (caro).",
          "Resultado: tu precio promedio de compra es más bajo que el pico del mercado.",
          "Históricamente, DCA en SPY durante 10 años siempre ha sido rentable, sin excepción desde 1970.",
        ],
      },
    ],
  },
  intermedio: {
    titulo: "Intermedio — Análisis técnico",
    temas: [
      {
        nombre: "RSI — Índice de Fuerza Relativa",
        icon: "📉",
        contenido: [
          "El RSI mide si un activo ha subido demasiado (sobrecomprado) o caído demasiado (sobrevendido) en las últimas 14 sesiones.",
          "RSI > 70 = sobrecomprado. El activo ha subido mucho en poco tiempo. Posible corrección próxima.",
          "RSI < 30 = sobrevendido. El activo ha caído mucho. Posible rebote próximo.",
          "Ejemplo: Tesla con RSI 85 = ha subido agresivamente. Muchos traders considerarían esperar antes de comprar.",
          "IMPORTANTE: El RSI no garantiza el movimiento. Un activo puede estar en RSI 80 y seguir subiendo semanas.",
        ],
      },
      {
        nombre: "MACD — Convergencia/Divergencia",
        icon: "📊",
        contenido: [
          "El MACD detecta cambios de tendencia comparando dos medias móviles exponenciales (EMA 12 y EMA 26).",
          "Señal alcista: La línea MACD cruza por ENCIMA de la línea señal. Indica momentum positivo.",
          "Señal bajista: La línea MACD cruza por DEBAJO de la línea señal. Indica momentum negativo.",
          "El MACD funciona mejor en tendencias claras. En mercados laterales genera muchas señales falsas.",
          "En InvertIA, combinamos MACD con RSI y Bollinger para reducir falsas señales.",
        ],
      },
      {
        nombre: "Bandas de Bollinger",
        icon: "〰️",
        contenido: [
          "Son tres líneas: media móvil de 20 días ± 2 desviaciones estándar.",
          "Banda superior = precio 'caro' estadísticamente. Banda inferior = precio 'barato' estadísticamente.",
          "Precio toca banda superior = posible sobrecompra. Precio toca banda inferior = posible sobreventa.",
          "Las bandas se estrechan cuando hay baja volatilidad. Luego suele venir un movimiento grande (puede ser arriba o abajo).",
          "Ejemplo: Bitcoin tocó la banda inferior en mayo 2022 → rebotó +45% en las siguientes 8 semanas.",
        ],
      },
      {
        nombre: "Sharpe Ratio",
        icon: "⚖️",
        contenido: [
          "El Sharpe mide cuánto retorno extra obtienes por cada unidad de riesgo que aceptas.",
          "Sharpe = (Retorno del activo - Tasa libre de riesgo) / Volatilidad del activo",
          "Sharpe > 1 = bueno (ganas más de lo que arriesgas). > 2 = excelente. < 0 = malo.",
          "Ejemplo: Si el S&P500 da 10% anual y la volatilidad es 15%, y la tasa libre de riesgo es 4.5%: Sharpe = (10-4.5)/15 = 0.37",
          "Cripto suele tener Sharpe bajo (mucho riesgo por unidad de retorno). Bonos tienen Sharpe muy bajo.",
        ],
      },
    ],
  },
  avanzado: {
    titulo: "Avanzado — Modelos cuantitativos",
    temas: [
      {
        nombre: "VaR — Valor en Riesgo",
        icon: "🎲",
        contenido: [
          "VaR al 95% = la pérdida máxima que esperarías en el 5% de los peores días del año.",
          "Si una acción tiene VaR -5%, en el 5% de los días (≈13 días/año) podrías perder hasta 5% en un día.",
          "VaR = percentil 5 de los retornos diarios históricos × √252 para anualizar.",
          "InvertIA calcula el VaR con datos reales de 1 año via yfinance + suavizado wavelet.",
          "Limitación: El VaR histórico asume que el futuro será como el pasado. Los crash extremos ('cisnes negros') lo superan.",
        ],
      },
      {
        nombre: "Kelly Criterion",
        icon: "🧮",
        contenido: [
          "El criterio de Kelly calcula el tamaño óptimo de posición para maximizar el crecimiento del capital a largo plazo.",
          "Kelly % = (p × b - q) / b, donde p = probabilidad de ganar, b = ratio ganancia/pérdida, q = probabilidad de perder.",
          "En InvertIA usamos Half-Kelly (multiplicamos por 0.5) porque es más conservador y más usado en práctica profesional.",
          "Limitamos el resultado al 10% máximo por activo para controlar el riesgo de concentración.",
          "Ejemplo: Win rate 60%, ganancia promedio 15%, pérdida promedio 8% → Kelly = (0.6×15 - 0.4×8)/15 = 39% → Half-Kelly = 19.5% → Limitado a 10%",
        ],
      },
      {
        nombre: "Wavelet Denoising",
        icon: "🌊",
        contenido: [
          "Los precios financieros tienen ruido aleatorio que puede confundir los indicadores técnicos.",
          "InvertIA aplica wavelet Daubechies 4 (db4) antes de calcular RSI, MACD y Bollinger.",
          "El wavelet descompone la señal de precios en diferentes frecuencias y elimina el ruido de alta frecuencia.",
          "Resultado: indicadores más estables y menos señales falsas en mercados muy volátiles.",
          "Fuente académica: arxiv 2408.12408 (2024) — método validado para series financieras.",
        ],
      },
      {
        nombre: "FinBERT — NLP Financiero",
        icon: "🤖",
        contenido: [
          "FinBERT es un modelo de lenguaje (tipo BERT) pre-entrenado en textos financieros: reportes, noticias, tweets.",
          "Clasifica texto financiero en positivo, negativo o neutro con mayor precisión que modelos de NLP general.",
          "En InvertIA, FinBERT analiza titulares de Finnhub y posts de Reddit en tiempo real.",
          "Score = (positivos - negativos) / total × 100. Rango: -100 (extremadamente bajista) a +100 (extremadamente alcista).",
          "Limitación: el modelo fue entrenado hasta 2020. Nuevos términos y contextos pueden no captarse perfectamente.",
        ],
      },
    ],
  },
};

export default function AprenderPage() {
  const [nivel, setNivel] = useState<Nivel>("basico");
  const [temaAbierto, setTemaAbierto] = useState<string | null>(null);

  const contenido = CONTENIDO[nivel];

  return (
    <main className="min-h-screen" style={{ background: "#0f172a" }}>
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-black text-blue-400">InvertIA</a>
          <div className="flex items-center gap-1">
            {[{ href: "/", label: "Análisis" }, { href: "/historial", label: "Historial" }, { href: "/portafolio", label: "Portafolio" }, { href: "/precision", label: "Precisión 🎯" }, { href: "/aprender", label: "Aprender" }].map((l) => (
              <a key={l.href} href={l.href} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-800">{l.label}</a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Centro de aprendizaje</h1>
          <p className="text-slate-400 mt-1">Conceptos de inversión explicados con claridad y ejemplos reales.</p>
        </div>

        {/* Niveles */}
        <div className="flex gap-2">
          {([
            { id: "basico",       label: "🟢 Básico",       desc: "Acciones, ETFs, DCA" },
            { id: "intermedio",   label: "🟡 Intermedio",   desc: "RSI, MACD, Sharpe" },
            { id: "avanzado",     label: "🔴 Avanzado",     desc: "VaR, Kelly, FinBERT" },
          ] as { id: Nivel; label: string; desc: string }[]).map((n) => (
            <button
              key={n.id}
              onClick={() => { setNivel(n.id); setTemaAbierto(null); }}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                nivel === n.id
                  ? "border-blue-500 bg-blue-500/15"
                  : "border-slate-700 bg-slate-800 hover:border-slate-500"
              }`}
            >
              <p className={`font-semibold text-sm ${nivel === n.id ? "text-blue-200" : "text-slate-300"}`}>{n.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
            </button>
          ))}
        </div>

        {/* Temas */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">{contenido.titulo}</h2>
          {contenido.temas.map((tema) => (
            <div key={tema.nombre} className="card overflow-hidden">
              <button
                onClick={() => setTemaAbierto(temaAbierto === tema.nombre ? null : tema.nombre)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="text-2xl">{tema.icon}</span>
                <span className="flex-1 font-semibold text-slate-100">{tema.nombre}</span>
                <span className="text-slate-500">{temaAbierto === tema.nombre ? "▲" : "▼"}</span>
              </button>

              {temaAbierto === tema.nombre && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-700 pt-4 animate-fade-in">
                  {tema.contenido.map((parrafo, i) => (
                    <p key={i} className={`text-sm leading-relaxed ${
                      parrafo.startsWith("Ejemplo:") ? "text-blue-300 bg-blue-500/10 rounded-lg px-3 py-2" :
                      parrafo.startsWith("Limitación:") || parrafo.startsWith("IMPORTANTE:") ? "text-yellow-300/90 bg-yellow-500/10 rounded-lg px-3 py-2" :
                      parrafo.startsWith("Fuente:") ? "text-slate-500 text-xs" :
                      "text-slate-300"
                    }`}>
                      {parrafo}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer educativo */}
        <div className="card p-5 border-blue-500/20 bg-blue-500/5">
          <h3 className="font-semibold text-blue-300 mb-2">📚 Fuentes académicas usadas en InvertIA</h3>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Wavelet denoising para series financieras: arxiv 2408.12408 (2024)</li>
            <li>• LLMs en análisis financiero: arxiv 2412.19245 (74.4% precisión)</li>
            <li>• Smart filtering de señales: arxiv 2512.15738</li>
            <li>• Volumen de menciones Reddit como predictor: arxiv 2507.22922</li>
            <li>• Límites de precisión en mercados eficientes: arxiv 1908.08168 (Georgia Tech)</li>
            <li>• FinBERT: github.com/ProsusAI/finBERT (Prosus AI)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
