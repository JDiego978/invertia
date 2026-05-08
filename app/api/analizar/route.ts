import { NextRequest, NextResponse } from "next/server";
import { analizarRapido, analizarProfundo } from "@/lib/anthropic";
import { fetchDataEngine } from "@/lib/dataEngine";
import type { ParametrosAnalisis } from "@/lib/types";

export const maxDuration = 60; // Vercel Hobby máximo

export async function POST(req: NextRequest) {
  try {
    const params: ParametrosAnalisis = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada en .env.local" },
        { status: 500 }
      );
    }

    // 1. Obtener datos reales del data engine Python
    let datosEngine: unknown = {};
    try {
      datosEngine = await fetchDataEngine(params);
    } catch (err) {
      console.warn("Backend Python no disponible, continuando con datos mínimos:", err);
      datosEngine = { aviso: "Backend Python no disponible. Análisis basado solo en IA." };
    }

    // 2. Llamar a Claude con los datos
    const resultado =
      params.modo === "profundo"
        ? await analizarProfundo(params, datosEngine)
        : await analizarRapido(params, datosEngine);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en /api/analizar:", error);
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
