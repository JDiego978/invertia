import { NextRequest, NextResponse } from "next/server";
import { analizarRapido, analizarProfundo } from "@/lib/groq";
import { fetchDataEngine } from "@/lib/dataEngine";
import type { ParametrosAnalisis } from "@/lib/types";

export const maxDuration = 60; // Vercel Hobby máximo

export async function POST(req: NextRequest) {
  try {
    const params: ParametrosAnalisis = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada en .env.local" },
        { status: 500 }
      );
    }

    // 1. Verificar que el data engine esté activo
    const backendUrl = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";
    try {
      const health = await fetch(`${backendUrl}/health`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!health.ok) throw new Error(`Health check falló: ${health.status}`);
    } catch (err) {
      console.error("Data engine no disponible:", err);
      return NextResponse.json(
        { error: "Data engine no disponible. El backend Python (Render) no responde. Verifica que esté activo en dashboard.render.com." },
        { status: 503 }
      );
    }

    // 2. Obtener datos reales del data engine Python
    let datosEngine: unknown = {};
    try {
      datosEngine = await fetchDataEngine(params);
    } catch (err) {
      console.error("Error obteniendo datos del engine:", err);
      return NextResponse.json(
        { error: "Error al obtener datos de mercado del backend Python. Inténtalo de nuevo." },
        { status: 502 }
      );
    }

    // 3. Llamar a Groq con los datos reales
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
