import { NextResponse } from "next/server";

export const maxDuration = 60;

// Despierta el backend de Render haciendo ping con reintentos.
// El frontend llama a este endpoint primero y espera "ready" antes de analizar.
export async function GET() {
  const backendUrl = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";
  const deadline = Date.now() + 55_000; // 55s máximo (dentro del límite Vercel)

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${backendUrl}/health`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        return NextResponse.json({ status: "ready" });
      }
    } catch {
      // backend hibernado — seguir intentando
    }
    // Esperar 4s antes del siguiente intento
    await new Promise((r) => setTimeout(r, 4_000));
  }

  return NextResponse.json({ status: "timeout" }, { status: 503 });
}
