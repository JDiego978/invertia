import { NextRequest, NextResponse } from "next/server";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const { portafolio } = await req.json();

    if (!portafolio || portafolio.length === 0) {
      return NextResponse.json({ error: "Portafolio vacío" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });
    }

    const totalValor = portafolio.reduce((s: number, e: { valorCompra: number }) => s + e.valorCompra, 0);

    const prompt = `Analiza este portafolio personal de inversiones y da recomendaciones claras y accionables en español.

PORTAFOLIO:
${portafolio.map((e: { activo: string; ticker: string; tipo: string; valorCompra: number }) =>
  `- ${e.activo} (${e.ticker}) [${e.tipo}]: $${e.valorCompra.toFixed(0)} USD (${((e.valorCompra / totalValor) * 100).toFixed(1)}% del total)`
).join("\n")}

VALOR TOTAL: $${totalValor.toFixed(0)} USD

Responde en 3 secciones claras:
1. CONCENTRACIÓN: ¿Está sobre-concentrado en algún sector o tipo de activo? ¿Qué riesgo implica?
2. COMPLEMENTOS: 2-3 activos concretos que complementarían este portafolio (con razón específica).
3. SEÑALES DE VENTA: ¿Hay algo en el portafolio que deberías considerar reducir y por qué?

Sé directo, usa datos y porcentajes. No uses bullet points con guiones, usa números para las secciones.`;

    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const texto = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ recomendacion: texto });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
