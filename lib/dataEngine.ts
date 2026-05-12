import type { ParametrosAnalisis } from "./types";

const BACKEND_URL = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

export async function fetchDataEngine(params: ParametrosAnalisis): Promise<unknown> {
  const cacheKey = JSON.stringify(params);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(50_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Sin detalles");
    throw new Error(`Backend error ${res.status}: ${err}`);
  }

  const data = await res.json();
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

export async function fetchPrecioActual(ticker: string): Promise<number | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/price/${ticker}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.precio ?? null;
  } catch {
    return null;
  }
}
