import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { portafolio } = await req.json();

    if (!portafolio || portafolio.length === 0) {
      return NextResponse.json({ error: "Portafolio vacío" }, { status: 400 });
    }

    const totalValor = portafolio.reduce((s: number, e: { valorCompra: number }) => s + e.valorCompra, 0);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Analiza este portafolio personal de inversiones y da recomendaciones claras y accionables en español.

PORTAFOLIO:
${portafolio.map((e: { activo: string; ticker: string; tipo: string; valorCompra: number }) =>
  `- ${e.activo} (${e.ticker}) [${e.tipo}]: $${e.valorCompra.toFixed(0)} USD (${((e.valorCompra / totalValor) * 100).toFixed(1)}% del total)`
).join("\n")}

VALOR TOTAL: $${totalValor.toFixed(0)} USD

Responde en 3 secciones claras:
1. CONCENTRACIÓN: ¿Está sobre-concentrado en algún sector o tipo de activo? ¿Qué riesgo implica?
2. COMPLEMENTOS: 2-3 activos concretos que complementarían este portafolio (con razón específica).
3. SEÑALES DE VENTA: ¿Hay algo en el portafolio que deberías considerar reducir y por qué?

Sé directo, usa datos y porcentajes. No uses bullet points con guiones, usa números para las secciones.`,
        },
      ],
    });

    const texto = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ recomendacion: texto });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
