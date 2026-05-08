import Anthropic from "@anthropic-ai/sdk";
import type { ParametrosAnalisis, ResultadoAnalisis } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres InvertIA, el sistema de análisis de inversiones más preciso disponible para inversores individuales. Analizas datos reales de mercado usando los mismos principios de los mejores hedge funds cuantitativos del mundo.

RAZONA SIEMPRE DESDE 3 PERSPECTIVAS INDEPENDIENTES:

[AGENTE_RIESGO]: Solo evalúa protección y riesgo.
Analiza: VaR, volatilidad, deuda/equity, put/call ratio, curva de rendimientos, max drawdown del backtest.

[AGENTE_RETORNO]: Solo evalúa potencial de ganancia.
Analiza: Sharpe ratio, ROE, FCF positivo, crecimiento de ingresos, RSI (momentum), MACD (tendencia), señal validada en backtest.

[AGENTE_REGIMEN]: Solo evalúa el contexto macro y sentimiento.
Analiza: inflación, tasa libre de riesgo, Fear & Greed, sentimiento de noticias (FinBERT), señal de insiders, Google Trends, ciclo económico actual.

CONSENSO: Indica si los 3 agentes coinciden (alta convicción), 2 de 3 (convicción moderada), o discrepan (señal débil).

REGLAS CRÍTICAS:
1. Basa TODAS las conclusiones en los datos reales proporcionados.
2. Explica con números concretos POR QUÉ es una oportunidad ahora.
3. Identifica claramente si algo es una SORPRESA vs ya estaba descontado.
4. Señala contradicciones entre señales (ej: RSI alcista pero insiders vendiendo).
5. Si hay evento macro de alto impacto en <5 días, añadir alerta visible.
6. Responde ÚNICAMENTE con el JSON solicitado. Sin texto adicional. Sin backticks. Sin explicaciones fuera del JSON.`;

function buildUserPrompt(params: ParametrosAnalisis, datosEngine: unknown): string {
  return `Analiza las siguientes oportunidades de inversión para un usuario de ${params.pais} con perfil de riesgo ${params.riesgo}, horizonte ${params.horizonte} y moneda local ${params.moneda}.
${params.monto ? `Monto disponible: ${params.monto} ${params.moneda}` : "Sin monto especificado."}
Tipos solicitados: ${params.tipos.join(", ")}.
${params.sectores.length > 0 ? `Sectores de interés: ${params.sectores.join(", ")}.` : ""}

DATOS CALCULADOS EN TIEMPO REAL (data engine):
${JSON.stringify(datosEngine, null, 2)}

Devuelve el análisis completo en JSON con exactamente esta estructura:
{
  "resumen_mercado": "string",
  "alerta_macro": "string | null",
  "ciclo_economico": { "fase": "expansion|pico|contraccion|recuperacion", "sectores_favorecidos": [], "sectores_desfavorecidos": [] },
  "oportunidades": [ ... ],
  "por_sector": [ ... ],
  "apps_recomendadas": [ ... ]
}

Incluye ${params.modo === "profundo" ? "5" : "3"} oportunidades ordenadas por puntuacion_final descendente.
Para cada oportunidad, incluye todos los campos del schema definido, especialmente: agente_riesgo, agente_retorno, agente_regimen, señales_contradictorias, por_que_ahora, backtest, kelly (con monto_local en ${params.moneda}), y eventos_futuros.`;
}

export async function analizarRapido(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(params, datosEngine) }],
  });

  const texto = response.content[0].type === "text" ? response.content[0].text : "";
  return parseRespuesta(texto, params);
}

export async function analizarProfundo(
  params: ParametrosAnalisis,
  datosEngine: unknown
): Promise<ResultadoAnalisis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] as any,
    messages: [
      {
        role: "user",
        content:
          buildUserPrompt(params, datosEngine) +
          "\n\nANTES de responder, busca en internet: noticias financieras de hoy, eventos geopolíticos relevantes y tendencias emergentes del mercado. Usa la búsqueda web para enriquecer el análisis con información actualizada.",
      },
    ],
  });

  const textos = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return parseRespuesta(textos, params);
}

function parseRespuesta(texto: string, params: ParametrosAnalisis): ResultadoAnalisis {
  const jsonMatch =
    texto.match(/```json\s*([\s\S]*?)```/) ||
    texto.match(/```\s*([\s\S]*?)```/) ||
    [null, texto];

  const jsonStr = jsonMatch[1]?.trim() ?? texto.trim();

  let parsed: Omit<ResultadoAnalisis, "timestamp" | "parametros">;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      parsed = JSON.parse(jsonStr.slice(firstBrace, lastBrace + 1));
    } else {
      throw new Error("No se pudo parsear la respuesta de Claude");
    }
  }

  return {
    ...parsed,
    timestamp: new Date().toISOString(),
    parametros: params,
  };
}
