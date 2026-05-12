import type { ParametrosAnalisis, ResultadoAnalisis, Oportunidad, DatosTecnicos, DatosCuantitativos, DatosFundamentales, AppInversion } from "./types";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL_PRIMARY = "llama-3.3-70b-versatile";
const MODEL_FALLBACK = "llama-3.1-8b-instant";

// ─── Apps hardcodeadas por país (verificadas, no inventadas por Groq) ─────────
const APPS_POR_PAIS: Record<string, AppInversion[]> = {
  default: [
    {
      nombre: "Interactive Brokers",
      emoji: "🏦",
      disponible_en: ["Colombia", "México", "Argentina", "Chile", "Perú", "Brasil", "España", "Estados Unidos", "Global"],
      activos: ["Acciones US/Global", "ETFs", "Opciones", "Futuros", "Forex", "Bonos"],
      comisiones: "$0 en acciones US (IBKR Lite)",
      minimo: "Sin mínimo",
      mejor_para: "Inversores intermedios y avanzados con portafolios globales",
      regulacion: "SEC, FINRA, SIPC, FCA, MiFID II",
      puntuacion: 4.8,
      pros: ["Mercados globales", "Costos muy bajos", "Herramientas profesionales"],
      contras: ["Interfaz compleja para novatos", "Formularios detallados al abrir cuenta"],
    },
    {
      nombre: "Hapi",
      emoji: "📱",
      disponible_en: ["Colombia", "México", "Argentina", "Chile", "Perú", "España"],
      activos: ["Acciones US", "ETFs", "Cripto"],
      comisiones: "Sin comisiones de broker",
      minimo: "Desde $1 USD",
      mejor_para: "Principiantes en LATAM que quieren acceder al mercado US",
      regulacion: "SEC, FINRA, SIPC",
      puntuacion: 4.5,
      pros: ["Sin comisiones", "Interfaz sencilla", "Inversión mínima muy baja"],
      contras: ["Solo activos US", "Sin análisis avanzado"],
    },
    {
      nombre: "Binance",
      emoji: "🪙",
      disponible_en: ["Colombia", "México", "Chile", "Perú", "Brasil", "España", "Argentina"],
      activos: ["Cripto (500+ pares)", "Futuros cripto", "Staking"],
      comisiones: "0.1% por transacción",
      minimo: "Desde $10 USD equiv.",
      mejor_para: "Inversores en cripto con experiencia",
      regulacion: "Regulación varía por país",
      puntuacion: 4.2,
      pros: ["Mayor liquidez cripto", "Muchos pares", "Staking disponible"],
      contras: ["Solo cripto", "Regulación compleja en algunos países"],
    },
    {
      nombre: "eToro",
      emoji: "🌐",
      disponible_en: ["Colombia", "Chile", "Perú", "España", "México"],
      activos: ["Acciones US/Global", "ETFs", "Cripto", "Forex"],
      comisiones: "Sin comisión en acciones (spread en forex)",
      minimo: "Desde $50 USD",
      mejor_para: "Inversores que quieren copy-trading y diversificación",
      regulacion: "FCA, CySEC, ASIC",
      puntuacion: 4.3,
      pros: ["Copy trading", "Interfaz intuitiva", "Activos variados"],
      contras: ["Spread en forex alto", "Retiro tiene comisión $5"],
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
      nombre: "XTB",
      emoji: "📊",
      disponible_en: ["Colombia", "Chile", "Perú", "España"],
      activos: ["Acciones", "ETFs", "Forex", "Índices", "Commodities"],
      comisiones: "0% en acciones reales hasta €100k/mes",
      minimo: "Sin mínimo",
      mejor_para: "Inversores activos con interés en múltiples mercados",
      regulacion: "KNF, FCA, CySEC",
      puntuacion: 4.4,
      pros: ["Sin comisiones acciones", "Plataforma xStation potente", "Educación"],
      contras: ["CFDs tienen riesgo alto", "No disponible en todos los países LATAM"],
    },
  ],
};

function getAppsParaPais(pais: string, tipos: string[]): AppInversion[] {
  const NOMBRES_PAIS: Record<string, string> = {
    CO: "Colombia", MX: "México", AR: "Argentina", CL: "Chile",
    PE: "Perú", BR: "Brasil", PA: "Panamá", UY: "Uruguay",
    VE: "Venezuela", ES: "España", GB: "Reino Unido", US: "Estados Unidos", CA: "Canadá",
  };
  const nombrePais = NOMBRES_PAIS[pais] ?? pais;
  const tieneCripto = tipos.includes("cripto");

  const todas = APPS_POR_PAIS.default;
  const filtradas = todas.filter((a) =>
    a.disponible_en.some((p) =>
      p.toLowerCase() === nombrePais.toLowerCase() ||
      p.toLowerCase() === "global"
    )
  );

  // Si solo cripto, priorizar Binance; si no hay cripto, quitar Binance
  const ordenadas = [...filtradas].sort((a, b) => {
    if (!tieneCripto && a.nombre === "Binance") return 1;
    if (!tieneCripto && b.nombre === "Binance") return -1;
    return b.puntuacion - a.puntuacion;
  });

  return ordenadas.slice(0, 3);
}

// ─── Validador de campos del engine ──────────────────────────────────────────
function sanitizarDatosEngine(activo: Record<string, unknown>): {
  tecnico: DatosTecnicos | null;
  cuantitativo: DatosCuantitativos | null;
  fundamental: Partial<DatosFundamentales>;
  sentimientoEngine: Record<string, unknown>;
  backtestEngine: Record<string, unknown>;
  kellyPct: number;
  scorePy: number | null;
  ticker: string;
  nombre: string;
  tipo: string;
} {
  const m = activo.datos_mercado as Record<string, unknown> | undefined;
  const bt = activo.backtest as Record<string, unknown> | undefined;
  const sc = activo.score_py as Record<string, unknown> | undefined;
  const nt = activo.noticias as Record<string, unknown> | undefined;

  // Técnico — solo para activos que tienen precios de mercado
  let tecnico: DatosTecnicos | null = null;
  const tipo = String(activo.tipo ?? "accion");
  if (m && tipo !== "inmueble" && tipo !== "bono") {
    const rsi = Number(m.rsi ?? 50);
    const rsiVal = isFinite(rsi) && rsi >= 0 && rsi <= 100 ? rsi : 50;
    const rsiSen = rsiVal > 70 ? "sobrecomprado" : rsiVal < 30 ? "sobrevendido" : "neutral";
    const macd = String(m.macd_señal ?? "neutral");
    const bbPos = String(m.bb_posicion ?? "media");
    tecnico = {
      rsi: Math.round(rsiVal * 10) / 10,
      rsi_señal: rsiSen,
      macd_señal: macd === "alcista" ? "alcista" : "bajista",
      bb_posicion: (["superior", "inferior", "media"].includes(bbPos) ? bbPos : "media") as "superior" | "inferior" | "media",
      golden_cross: Boolean(m.golden_cross),
      interpretacion: "", // Groq rellena esto
    };
  }

  // Cuantitativo
  let cuantitativo: DatosCuantitativos | null = null;
  if (m) {
    const sharpe = Number(m.sharpe ?? 0);
    const var95Raw = Number(m.var_95 ?? -5);
    // VaR siempre negativo
    const var95 = var95Raw > 0 ? -var95Raw : var95Raw;
    const vol = Number(m.volatilidad_anual ?? 20);
    cuantitativo = {
      sharpe: isFinite(sharpe) ? Math.round(sharpe * 100) / 100 : 0,
      var_95: isFinite(var95) ? Math.round(var95 * 10) / 10 : -5,
      volatilidad_anual: isFinite(vol) && vol > 0 ? Math.round(vol * 10) / 10 : 20,
      interpretacion: "", // Groq rellena esto
    };
  }

  // Fundamental
  const fund = (m?.fundamental as Record<string, unknown> | undefined) ?? {};
  const perRaw = Number(fund.per);
  const fundamental: Partial<DatosFundamentales> = {
    per: isFinite(perRaw) && perRaw > 0 && perRaw < 1000 ? Math.round(perRaw * 10) / 10 : undefined,
    roe_pct: fund.roe != null ? Math.round(Number(fund.roe) * 1000) / 10 : undefined,
    fcf_positivo: fund.fcf != null ? Number(fund.fcf) > 0 : undefined,
    deuda_equity: fund.debtToEquity != null ? Math.round(Number(fund.debtToEquity) * 100) / 100 : undefined,
    interpretacion: "",
  };

  // PCR — validar rango 0.3–3.0
  const pcrRaw = Number(m?.pcr ?? 1);
  const pcr = isFinite(pcrRaw) && pcrRaw >= 0.3 && pcrRaw <= 3.0 ? pcrRaw : 1.0;

  const sentimientoEngine = {
    score_noticias: Number(nt?.score_noticias ?? 0),
    pcr,
  };

  const backtestEngine = bt ?? {};
  const kellyPct = isFinite(Number(activo.kelly_pct)) ? Number(activo.kelly_pct) : 5;
  const scorePy = sc?.puntuacion_py != null && isFinite(Number(sc.puntuacion_py))
    ? Number(sc.puntuacion_py) : null;

  return {
    tecnico,
    cuantitativo,
    fundamental,
    sentimientoEngine,
    backtestEngine,
    kellyPct,
    scorePy,
    ticker: String(activo.ticker ?? ""),
    nombre: String(activo.activo ?? activo.ticker ?? ""),
    tipo,
  };
}

// ─── Prompt de interpretación (solo textos, no números) ───────────────────────
function buildPromptInterpretacion(
  params: ParametrosAnalisis,
  activosSanitizados: ReturnType<typeof sanitizarDatosEngine>[],
  macro: Record<string, unknown>
): string {
  const activos = activosSanitizados.map((a) => {
    const t = a.tecnico;
    const c = a.cuantitativo;
    return `${a.ticker}|${a.nombre}|RSI=${t?.rsi ?? "?"}(${t?.rsi_señal ?? "?"})|MACD=${t?.macd_señal ?? "?"}|Sh=${c?.sharpe ?? "?"}|VaR=${c?.var_95 ?? "?"}%|Vol=${c?.volatilidad_anual ?? "?"}%|PER=${a.fundamental.per ?? "?"}|ROE=${a.fundamental.roe_pct ?? "?"}%|Score=${a.scorePy ?? "?"}|Kelly=${a.kellyPct}%`;
  }).join("\n");

  return `Analista experto. Datos REALES ya calculados — solo escribe interpretaciones en español.

Contexto: ${params.pais} | ${params.riesgo} | ${params.horizonte} | ${params.moneda}
Macro: inflacion=${macro.inflacion ?? "?"}% tasa10y=${macro.tasa_10y ?? "?"}% GDP=${macro.gdp_growth ?? "?"}%

Activos:
${activos}

JSON de respuesta:
{"interpretaciones":[{"ticker":"XXXX","tendencia":"alcista|bajista|lateral","puntuacion_final":0-100,"nivel_confianza":"ALTA_CONVICCION|MODERADA|BAJA","consenso_agentes":"total|mayoria|dividido","señales_contradictorias":["s1"],"resumen":"2 oraciones","por_que_ahora":"cita RSI/Score","agente_riesgo":"cita VaR/Vol","agente_retorno":"cita Sharpe","agente_regimen":"contexto macro","tecnico_interpretacion":"1 oración RSI/MACD","cuantitativo_interpretacion":"1 oración Sharpe/VaR","fundamental_interpretacion":"1 oración PER/ROE","per_vs_sector":"barato|justo|caro","riesgo_activo":"bajo|medio|alto","pros":["p1","p2"],"contras":["c1"],"horizonte_recomendado":"corto|mediano|largo","porcentaje_portafolio":"5-10%","kelly_advertencia":"texto","eventos_futuros":[{"evento":"nombre","fecha":"YYYY-MM-DD","impacto":"alto|medio|bajo","dias_restantes":30,"direccion_historica":"sube X%"}],"insider_signal":"neutral|compra_leve|compra_fuerte|venta_leve|venta_fuerte","fondos_top":["Vanguard"]}],"resumen_mercado":"párrafo mercado","alerta_macro":null,"ciclo_economico":{"fase":"expansion|pico|contraccion|recuperacion","sectores_favorecidos":["s1"],"sectores_desfavorecidos":["s2"]},"por_sector":[{"sector":"nombre","emoji":"💻","mejor_activo":"TICK","razon_lider":"razón","puntuacion_sector":75,"tendencia_sector":"alcista","otros_destacados":["T2"],"riesgo_sector":"medio"}]}

REGLAS: consenso_agentes sin tildes ("mayoria" no "mayoría") | riesgo_activo solo "bajo"/"medio"/"alto" | NO inventar tickers | Solo JSON`;
}

// ─── Ensamblador: combina datos engine + interpretaciones Groq ────────────────
function ensamblarResultado(
  params: ParametrosAnalisis,
  activosSanitizados: ReturnType<typeof sanitizarDatosEngine>[],
  interpretaciones: Record<string, unknown>[],
  meta: {
    resumen_mercado: string;
    alerta_macro: string | null;
    ciclo_economico: ResultadoAnalisis["ciclo_economico"];
    por_sector: ResultadoAnalisis["por_sector"];
  },
  macro: Record<string, unknown>
): ResultadoAnalisis {
  const interpMap = new Map<string, Record<string, unknown>>();
  for (const i of interpretaciones) {
    interpMap.set(String(i.ticker), i);
  }

  const oportunidades: Oportunidad[] = activosSanitizados.map((a) => {
    const interp = interpMap.get(a.ticker) ?? {};
    const monto = params.monto ?? 0;
    const kellyMonto = Math.round((a.kellyPct / 100) * monto);

    // Normalizar riesgo
    const riesgoRaw = String(interp.riesgo_activo ?? "medio").toLowerCase();
    const riesgo = (["bajo", "medio", "alto"].includes(riesgoRaw) ? riesgoRaw : "medio") as "bajo" | "medio" | "alto";

    // Normalizar consenso
    const consensoRaw = String(interp.consenso_agentes ?? "mayoria").toLowerCase();
    const consenso = (["total", "mayoria", "dividido"].includes(consensoRaw) ? consensoRaw : "mayoria") as "total" | "mayoria" | "dividido";

    // Puntuacion final
    let puntuacion = Number(interp.puntuacion_final ?? 50);
    if (!isFinite(puntuacion) || puntuacion < 0 || puntuacion > 100) puntuacion = 50;

    // Nivel confianza — validar consistencia con puntuacion
    let nivelConf = String(interp.nivel_confianza ?? "MODERADA");
    if (!["ALTA_CONVICCION", "MODERADA", "BAJA"].includes(nivelConf)) nivelConf = "MODERADA";
    // Corregir contradicciones
    if (nivelConf === "ALTA_CONVICCION" && puntuacion < 60) nivelConf = "MODERADA";
    if (nivelConf === "BAJA" && puntuacion > 70) nivelConf = "MODERADA";

    // Señal validada de backtest
    const btWinRate = Number(a.backtestEngine.win_rate_pct ?? 50);
    const señalValidada = isFinite(btWinRate) ? btWinRate > 52 : false;

    // Tecnico con interpretacion de Groq
    const tec = a.tecnico ? {
      ...a.tecnico,
      interpretacion: String(interp.tecnico_interpretacion ?? ""),
    } : null;

    // Cuantitativo con interpretacion de Groq
    const cuant = a.cuantitativo ? {
      ...a.cuantitativo,
      interpretacion: String(interp.cuantitativo_interpretacion ?? ""),
    } : null;

    // Fundamental
    const perVsSector = String(interp.per_vs_sector ?? "justo");
    const fund = {
      ...a.fundamental,
      per_vs_sector: (["barato", "justo", "caro"].includes(perVsSector) ? perVsSector : "justo") as "barato" | "justo" | "caro",
      interpretacion: String(interp.fundamental_interpretacion ?? ""),
    };

    // Tipo normalizado
    const tipoValido = ["accion", "cripto", "etf", "inmueble", "commodity", "bono"];
    const tipo = (tipoValido.includes(a.tipo) ? a.tipo : "accion") as Oportunidad["tipo"];

    return {
      nombre: a.nombre,
      ticker: a.ticker,
      tipo,
      riesgo,
      tendencia: (["alcista", "bajista", "lateral"].includes(String(interp.tendencia)) ? interp.tendencia : "lateral") as "alcista" | "bajista" | "lateral",
      puntuacion_final: Math.round(puntuacion),
      nivel_confianza: nivelConf as "ALTA_CONVICCION" | "MODERADA" | "BAJA",
      consenso_agentes: consenso,
      señales_contradictorias: Array.isArray(interp.señales_contradictorias) ? interp.señales_contradictorias as string[] : [],
      resumen: String(interp.resumen ?? "Activo analizado con datos reales de mercado."),
      por_que_ahora: String(interp.por_que_ahora ?? ""),
      agente_riesgo: String(interp.agente_riesgo ?? ""),
      agente_retorno: String(interp.agente_retorno ?? ""),
      agente_regimen: String(interp.agente_regimen ?? ""),
      tecnico: tec ?? {
        rsi: 50, rsi_señal: "neutral", macd_señal: "bajista",
        bb_posicion: "media", golden_cross: false, interpretacion: "Sin datos técnicos disponibles.",
      },
      cuantitativo: cuant ?? {
        sharpe: 0, var_95: -5, volatilidad_anual: 20, interpretacion: "Sin datos cuantitativos disponibles.",
      },
      fundamental: {
        ...fund,
        interpretacion: String(interp.fundamental_interpretacion ?? "Sin datos fundamentales."),
      },
      sentimiento: {
        score_noticias: Number(a.sentimientoEngine.score_noticias ?? 0),
        score_reddit: 0,
        google_trend_score: 50,
        alerta_hype: false,
        divergencia: "neutral",
      },
      institucional: {
        insider_signal: (["compra_fuerte","compra_leve","neutral","venta_leve","venta_fuerte"].includes(String(interp.insider_signal)) ? interp.insider_signal : "neutral") as "compra_fuerte" | "compra_leve" | "neutral" | "venta_leve" | "venta_fuerte",
        ratio_compra_venta: 1,
        fondos_top: Array.isArray(interp.fondos_top) ? interp.fondos_top as string[] : [],
        cambio_ownership_pct: 0,
      },
      opciones: {
        pcr: Number(a.sentimientoEngine.pcr ?? 1),
        pcr_señal: Number(a.sentimientoEngine.pcr) < 0.8 ? "alcista" : Number(a.sentimientoEngine.pcr) > 1.2 ? "bajista" : "neutral",
        dinero_inteligente: "neutral",
      },
      backtest: {
        win_rate_pct: isFinite(btWinRate) ? btWinRate : 50,
        sharpe_backtest: isFinite(Number(a.backtestEngine.sharpe)) ? Number(a.backtestEngine.sharpe) : 0,
        max_drawdown_pct: isFinite(Number(a.backtestEngine.max_drawdown_pct)) ? Number(a.backtestEngine.max_drawdown_pct) : 0,
        señal_validada: señalValidada,
      },
      kelly: {
        porcentaje_recomendado: Math.round(a.kellyPct * 10) / 10,
        monto_local: monto > 0 ? `${kellyMonto.toLocaleString("es-CO")} ${params.moneda}` : undefined,
        advertencia: String(interp.kelly_advertencia ?? "Usar half-Kelly conservador"),
      },
      eventos_futuros: Array.isArray(interp.eventos_futuros) ? interp.eventos_futuros as Oportunidad["eventos_futuros"] : [],
      horizonte_recomendado: (["corto","mediano","largo"].includes(String(interp.horizonte_recomendado)) ? interp.horizonte_recomendado : params.horizonte) as "corto" | "mediano" | "largo",
      porcentaje_portafolio_sugerido: String(interp.porcentaje_portafolio ?? "5-10%"),
      pros: Array.isArray(interp.pros) ? interp.pros as string[] : [],
      contras: Array.isArray(interp.contras) ? interp.contras as string[] : [],
    };
  });

  // Macro para ResultadoAnalisis
  const macroFinal = macro ? {
    tasa_10y: Number(macro.tasa_10y ?? 4.3),
    inflacion: Number(macro.inflacion ?? 3.1),
    desempleo: Number(macro.desempleo ?? 4.1),
    gdp_growth: Number(macro.gdp_growth ?? 2.8),
    curva_rendimientos: Number(macro.curva_rendimientos ?? 0.1),
  } : undefined;

  return {
    resumen_mercado: meta.resumen_mercado,
    alerta_macro: meta.alerta_macro ?? undefined,
    ciclo_economico: meta.ciclo_economico,
    oportunidades,
    por_sector: meta.por_sector ?? [],
    apps_recomendadas: getAppsParaPais(params.pais, params.tipos),
    timestamp: new Date().toISOString(),
    parametros: params,
    macro: macroFinal,
  };
}

// ─── Llamada a Groq (con fallback automático a 8b si 429 TPD en 70b) ─────────
async function callGroq(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const tryModel = async (model: string): Promise<Response> =>
    fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json; charset=utf-8",
      },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Responde siempre en español con caracteres UTF-8 correctos. Nunca uses entidades HTML ni codificación latin-1.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

  let res = await tryModel(MODEL_PRIMARY);

  // Si el modelo principal alcanzó el límite diario de tokens, usar el de fallback
  if (res.status === 429) {
    const errText = await res.text();
    const isTPD = errText.includes("tokens per day") || errText.includes("TPD") || errText.includes("daily");
    if (isTPD) {
      console.warn("[InvertIA] TPD 70b agotado — usando fallback llama-3.1-8b-instant");
      res = await tryModel(MODEL_FALLBACK);
    }
    if (!res.ok) {
      const err2 = await res.text();
      throw new Error(`Groq error ${res.status}: ${err2}`);
    }
  } else if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Reparar encoding roto (latin-1 interpretado como UTF-8: Ã³ → ó)
  try {
    const bytes = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) bytes[i] = content.charCodeAt(i);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded.includes("Ã") === false && content.includes("Ã")) return decoded;
  } catch { /* ignorar — usar el original */ }

  return content;
}

function parseGroqJSON(raw: string): Record<string, unknown> {
  const texto = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const intentos = [
    () => JSON.parse(texto),
    () => {
      const m = texto.match(/```json\s*([\s\S]*?)```/);
      if (!m) throw new Error();
      return JSON.parse(m[1].trim());
    },
    () => {
      const first = texto.indexOf("{");
      const last = texto.lastIndexOf("}");
      if (first === -1 || last === -1) throw new Error();
      return JSON.parse(texto.slice(first, last + 1));
    },
  ];

  for (const intento of intentos) {
    try { return intento(); } catch { /* siguiente */ }
  }
  console.error("[InvertIA] No se pudo parsear JSON de Groq:", texto.slice(0, 300));
  throw new Error("No se pudo parsear la respuesta del modelo. Inténtalo de nuevo.");
}

// ─── Exports principales ──────────────────────────────────────────────────────
export async function analizarRapido(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  return ejecutarAnalisis(params, datosEngine, 3, 4096);
}

export async function analizarProfundo(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  return ejecutarAnalisis(params, datosEngine, 5, 6000);
}

async function ejecutarAnalisis(
  params: ParametrosAnalisis,
  datosEngine: unknown,
  maxActivos: number,
  maxTokens: number
): Promise<ResultadoAnalisis> {
  const d = datosEngine as Record<string, unknown>;
  const activosRaw = Array.isArray(d?.activos) ? d.activos as Record<string, unknown>[] : [];
  const macro = (d?.macro as Record<string, unknown>) ?? {};

  if (activosRaw.length === 0) {
    throw new Error("El data engine no devolvió activos. Verifica que el backend Python esté activo y respondiendo en /analyze.");
  }

  // Sanitizar datos del engine — aquí los números son REALES y validados
  const activosSanitizados = activosRaw
    .slice(0, maxActivos)
    .map(sanitizarDatosEngine)
    .filter((a) => a.ticker); // descartar activos sin ticker

  // Pedir a Groq SOLO interpretaciones textuales — los números ya los tenemos
  const promptInterp = buildPromptInterpretacion(params, activosSanitizados, macro);
  const rawInterp = await callGroq(promptInterp, maxTokens);
  const jsonInterp = parseGroqJSON(rawInterp);

  const interpretaciones = Array.isArray(jsonInterp.interpretaciones)
    ? jsonInterp.interpretaciones as Record<string, unknown>[]
    : [];

  return ensamblarResultado(
    params,
    activosSanitizados,
    interpretaciones,
    {
      resumen_mercado: String(jsonInterp.resumen_mercado ?? "Análisis generado con datos reales de mercado."),
      alerta_macro: jsonInterp.alerta_macro ? String(jsonInterp.alerta_macro) : null,
      ciclo_economico: (jsonInterp.ciclo_economico as ResultadoAnalisis["ciclo_economico"]) ?? {
        fase: "expansion", sectores_favorecidos: [], sectores_desfavorecidos: [],
      },
      por_sector: (jsonInterp.por_sector as ResultadoAnalisis["por_sector"]) ?? [],
    },
    macro
  );
}
