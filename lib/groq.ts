import type { ParametrosAnalisis, ResultadoAnalisis } from "./types";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL_RAPIDO = "llama-3.3-70b-versatile";
const MODEL_PROFUNDO = "llama-3.3-70b-versatile";

function resumirDatosEngine(datosEngine: unknown): string {
  if (!datosEngine || typeof datosEngine !== "object") return "";
  const d = datosEngine as Record<string, unknown>;

  // Backend returns { activos: [...], macro: {...} }
  const activos = Array.isArray(d.activos) ? d.activos as Record<string, unknown>[] : [];
  const macro = d.macro as Record<string, unknown> | undefined;

  const lineas: string[] = [];

  // Macro summary
  if (macro) {
    const mp: string[] = [];
    if (macro.inflacion != null) mp.push(`inf=${macro.inflacion}%`);
    if (macro.tasa_interes != null) mp.push(`tasa=${macro.tasa_interes}%`);
    if (macro.pib_crecimiento != null) mp.push(`PIB=${macro.pib_crecimiento}%`);
    if (macro.dxy != null) mp.push(`DXY=${macro.dxy}`);
    if (mp.length) lineas.push(`macro: ${mp.join(" ")}`);
  }

  // Per-asset summary (compact)
  for (const activo of activos.slice(0, 8)) {
    const ticker = activo.ticker as string;
    const mercado = activo.datos_mercado as Record<string, unknown> | undefined;
    const noticias = activo.noticias as Record<string, unknown> | undefined;
    const backtest = activo.backtest as Record<string, unknown> | undefined;
    const scorePy = activo.score_py as Record<string, unknown> | undefined;

    if (!mercado) continue;

    const partes: string[] = [`${ticker}:`];
    if (mercado.precio_actual != null) partes.push(`p=${mercado.precio_actual}`);
    if (mercado.rsi != null) partes.push(`RSI=${mercado.rsi}`);
    if (mercado.rsi_señal) partes.push(`(${mercado.rsi_señal})`);
    if (mercado.macd_señal) partes.push(`MACD=${mercado.macd_señal}`);
    if (mercado.bb_posicion) partes.push(`BB=${mercado.bb_posicion}`);
    if (mercado.golden_cross != null) partes.push(`GC=${mercado.golden_cross}`);
    if (mercado.sharpe != null) partes.push(`Sharpe=${mercado.sharpe}`);
    if (mercado.var_95 != null) partes.push(`VaR=${mercado.var_95}%`);
    if (mercado.volatilidad_anual != null) partes.push(`Vol=${mercado.volatilidad_anual}%`);
    if (mercado.pcr != null) partes.push(`PCR=${mercado.pcr}`);

    const fund = mercado.fundamental as Record<string, unknown> | undefined;
    if (fund) {
      if (fund.per != null) partes.push(`PER=${fund.per}`);
      const roe = fund.roe as number | undefined;
      if (roe != null) partes.push(`ROE=${Math.round(roe * 100)}%`);
      if (fund.fcf != null) partes.push(`FCF=${(fund.fcf as number) > 0 ? "pos" : "neg"}`);
    }

    if (noticias?.score_noticias != null) partes.push(`SentNews=${noticias.score_noticias}`);
    if (backtest?.win_rate_pct != null) partes.push(`WinRate=${backtest.win_rate_pct}%`);
    if (scorePy?.puntuacion_py != null) partes.push(`Score=${scorePy.puntuacion_py}/10`);
    if (activo.kelly_pct != null) partes.push(`Kelly=${activo.kelly_pct}%`);

    lineas.push(partes.join(" "));
  }

  if (!lineas.length) return "";
  return `\nDatos reales de mercado:\n${lineas.join("\n")}`;
}

function buildPrompt(params: ParametrosAnalisis, datosEngine: unknown, profundo: boolean): string {
  const n = profundo ? 5 : 3;
  const montoKelly = params.monto ? Math.round(params.monto * 0.08) : 0;
  const datosStr = resumirDatosEngine(datosEngine);

  return `Eres un experto en inversiones. Genera análisis para: país=${params.pais}, perfil=${params.riesgo}, horizonte=${params.horizonte}, moneda=${params.moneda}${params.monto ? `, monto=${params.monto}` : ""}, tipos=[${params.tipos.join(",")}]${params.sectores.length > 0 ? `, sectores=[${params.sectores.join(",")}]` : ""}.${datosStr ? `\n${datosStr}\nIMPORTANTE: Usa los valores exactos de RSI, MACD, Sharpe, VaR, Score, Kelly y precio de los datos anteriores en los campos correspondientes. NO inventes números distintos. Si un ticker aparece en los datos, inclúyelo como oportunidad.` : ""}

Responde SOLO con JSON (sin texto extra) con estas claves exactas:
- resumen_mercado: string
- alerta_macro: null o string
- ciclo_economico: {fase, sectores_favorecidos[], sectores_desfavorecidos[]}
- oportunidades: array de ${n} objetos, cada uno con:
  nombre, ticker, tipo,
  riesgo(SOLO "bajo"|"medio"|"alto" — nunca un número),
  tendencia, puntuacion_final(0-100),
  nivel_confianza(ALTA_CONVICCION|MODERADA|BAJA),
  consenso_agentes(SOLO "total"|"mayoria"|"dividido" — sin tildes ni variantes),
  señales_contradictorias[], resumen, por_que_ahora,
  agente_riesgo, agente_retorno, agente_regimen,
  tecnico{rsi,rsi_señal,macd_señal,bb_posicion,golden_cross,interpretacion},
  cuantitativo{sharpe,var_95,volatilidad_anual,interpretacion},
  fundamental{per,per_vs_sector,roe_pct,fcf_positivo,deuda_equity,score_fundamental,interpretacion},
  sentimiento{score_noticias,score_reddit,google_trend_score,alerta_hype,divergencia},
  institucional{insider_signal,ratio_compra_venta,fondos_top[],cambio_ownership_pct},
  opciones{pcr,pcr_señal,dinero_inteligente},
  backtest{win_rate_pct,sharpe_backtest,max_drawdown_pct,señal_validada(true|false — nunca null)},
  kelly{porcentaje_recomendado,monto_local:"${montoKelly} ${params.moneda}",advertencia},
  eventos_futuros[], horizonte_recomendado, porcentaje_portafolio_sugerido,
  pros[], contras[]
- por_sector: array de 2 objetos con: sector, emoji, mejor_activo, razon_lider, puntuacion_sector, tendencia_sector, otros_destacados[], riesgo_sector
- apps_recomendadas: array de 2 objetos con apps disponibles en ${params.pais} (NO incluir apps no disponibles en ese país): nombre, emoji, disponible_en[], activos[], comisiones, minimo, mejor_para, regulacion, puntuacion, pros[], contras[]

Reglas críticas:
- Todos los números como números, NO strings
- riesgo SIEMPRE "bajo", "medio" o "alto"
- consenso_agentes SIEMPRE "total", "mayoria" o "dividido"
- backtest.señal_validada SIEMPRE true o false, nunca null
- kelly.monto_local = porcentaje_recomendado/100 * ${params.monto ?? 0} ${params.moneda}
- apps_recomendadas SOLO con apps que operan en ${params.pais}`;
}

function parseRespuesta(textoRaw: string, params: ParametrosAnalisis): ResultadoAnalisis {
  const texto = textoRaw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Omit<ResultadoAnalisis, "timestamp" | "parametros"> | null = null;

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
    try { parsed = intento(); break; } catch { /* siguiente */ }
  }

  if (!parsed) {
    console.error("[InvertIA] Respuesta cruda:", textoRaw.slice(0, 500));
    throw new Error("No se pudo parsear la respuesta del modelo. Inténtalo de nuevo.");
  }

  const r = parsed as ResultadoAnalisis;
  if (!r.resumen_mercado) r.resumen_mercado = "Análisis generado con datos de mercado disponibles.";
  if (!r.ciclo_economico) r.ciclo_economico = { fase: "expansion", sectores_favorecidos: [], sectores_desfavorecidos: [] };
  if (!Array.isArray(r.oportunidades)) r.oportunidades = [];
  if (!Array.isArray(r.por_sector)) r.por_sector = [];
  if (!Array.isArray(r.apps_recomendadas)) r.apps_recomendadas = [];

  return { ...r, timestamp: new Date().toISOString(), parametros: params };
}

async function callGroq(prompt: string, maxTokens: number, model = MODEL_RAPIDO): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada en .env.local");

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(50_000),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function analizarRapido(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  const texto = await callGroq(buildPrompt(params, datosEngine, false), 4096, MODEL_RAPIDO);
  return parseRespuesta(texto, params);
}

export async function analizarProfundo(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  const texto = await callGroq(buildPrompt(params, datosEngine, true), 6000, MODEL_PROFUNDO);
  return parseRespuesta(texto, params);
}
