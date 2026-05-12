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

    // Obtener datos reales del data engine Python
    let datosEngine: unknown = {};
    try {
      datosEngine = await fetchDataEngine(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error obteniendo datos del engine:", msg);
      return NextResponse.json(
        { error: `Backend de datos no disponible: ${msg}. Si es la primera vez del día, espera 30 segundos y vuelve a intentar (el servidor se está despertando).` },
        { status: 502 }
      );
    }

    // Verificar que el backend devolvió activos (puede devolver [] si hay error interno)
    const activos = (datosEngine as Record<string, unknown>)?.activos;
    if (!Array.isArray(activos) || activos.length === 0) {
      console.error("Backend devolvió activos vacíos:", JSON.stringify(datosEngine).slice(0, 200));
      return NextResponse.json(
        { error: "El servidor de datos no encontró activos para analizar. El backend puede estar reiniciándose — espera 30 segundos e inténtalo de nuevo." },
        { status: 503 }
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
