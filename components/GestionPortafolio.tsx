"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  guardarEntradaPortafolio, obtenerPortafolio, eliminarEntradaPortafolio,
} from "@/lib/storage";
import { fetchPrecioActual } from "@/lib/dataEngine";
import { formatUSD } from "@/lib/currency";
import type { EntradaPortafolio, TipoActivo } from "@/lib/types";

const COLORES = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#06b6d4"];

const TIPOS: TipoActivo[] = ["accion", "cripto", "etf", "inmueble", "commodity", "bono"];

export default function GestionPortafolio() {
  const [entradas, setEntradas] = useState<EntradaPortafolio[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [recomendacionIA, setRecomendacionIA] = useState<string | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [form, setForm] = useState<Partial<EntradaPortafolio>>({
    tipo: "accion",
    moneda_compra: "USD",
    fecha: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    obtenerPortafolio().then(setEntradas);
  }, []);

  useEffect(() => {
    if (entradas.length === 0) return;
    const tickers = Array.from(new Set(entradas.map((e) => e.ticker)));
    Promise.all(
      tickers.map(async (t) => {
        const p = await fetchPrecioActual(t);
        return [t, p] as [string, number | null];
      })
    ).then((resultados) => {
      const mapa: Record<string, number> = {};
      for (const [t, p] of resultados) {
        if (p !== null) mapa[t] = p;
      }
      setPrecios(mapa);
    });
  }, [entradas]);

  async function pedirRecomendacionIA() {
    if (entradas.length === 0) return;
    setCargandoIA(true);
    setRecomendacionIA(null);
    try {
      const resumen = entradas.map((e) => ({
        activo: e.activo,
        ticker: e.ticker,
        tipo: e.tipo,
        valorCompra: e.precio_compra * e.cantidad,
      }));
      const res = await fetch("/api/portafolio-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portafolio: resumen }),
      });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setRecomendacionIA(data.recomendacion);
    } catch {
      setRecomendacionIA("No se pudo obtener recomendación. Verifica que el servidor esté activo.");
    } finally {
      setCargandoIA(false);
    }
  }

  async function agregarEntrada() {
    if (!form.activo || !form.ticker || !form.cantidad || !form.precio_compra) {
      alert("Completa todos los campos obligatorios");
      return;
    }
    const nueva: EntradaPortafolio = {
      id: `portafolio-${Date.now()}`,
      activo:        form.activo!,
      ticker:        form.ticker!.toUpperCase(),
      tipo:          form.tipo as TipoActivo,
      cantidad:      Number(form.cantidad),
      precio_compra: Number(form.precio_compra),
      moneda_compra: form.moneda_compra ?? "USD",
      fecha:         form.fecha!,
      exchange:      form.exchange,
      notas:         form.notas,
    };
    await guardarEntradaPortafolio(nueva);
    setEntradas(await obtenerPortafolio());
    setMostrarForm(false);
    setForm({ tipo: "accion", moneda_compra: "USD", fecha: new Date().toISOString().slice(0, 10) });
  }

  async function eliminar(id: string) {
    await eliminarEntradaPortafolio(id);
    setEntradas(await obtenerPortafolio());
  }

  // Calcular métricas
  const resumen = entradas.map((e) => {
    const precioActual = precios[e.ticker];
    const valorActual = precioActual ? precioActual * e.cantidad : undefined;
    const valorCompra = e.precio_compra * e.cantidad;
    const gp = valorActual !== undefined ? valorActual - valorCompra : undefined;
    const gpPct = gp !== undefined ? (gp / valorCompra) * 100 : undefined;
    return { ...e, valorActual, ganancia_perdida: gp, ganancia_pct: gpPct };
  });

  const totalInvertido = resumen.reduce((s, e) => s + e.precio_compra * e.cantidad, 0);
  const totalActual = resumen.reduce((s, e) => s + (e.valorActual ?? e.precio_compra * e.cantidad), 0);
  const gananciaTotal = totalActual - totalInvertido;

  // Distribución por tipo para PieChart
  const porTipo = Object.entries(
    resumen.reduce((acc, e) => {
      const valor = e.valorActual ?? e.precio_compra * e.cantidad;
      acc[e.tipo] = (acc[e.tipo] ?? 0) + valor;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <div className="space-y-6">
      {/* Resumen */}
      {entradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Total invertido</p>
            <p className="text-xl font-bold text-slate-100">{formatUSD(totalInvertido)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Valor actual</p>
            <p className="text-xl font-bold text-slate-100">{formatUSD(totalActual)}</p>
          </div>
          <div className={`card p-4 text-center ${gananciaTotal >= 0 ? "bg-green-500/5" : "bg-red-500/5"}`}>
            <p className="text-xs text-slate-400 mb-1">Ganancia / Pérdida</p>
            <p className={`text-xl font-bold ${gananciaTotal >= 0 ? "text-green-400" : "text-red-400"}`}>
              {gananciaTotal >= 0 ? "+" : ""}{formatUSD(gananciaTotal)}
            </p>
            <p className={`text-xs ${gananciaTotal >= 0 ? "text-green-500" : "text-red-500"}`}>
              {((gananciaTotal / totalInvertido) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Gráfico de distribución */}
      {porTipo.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Distribución por tipo</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {porTipo.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatUSD(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2">
              {porTipo.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                  <span className="text-xs text-slate-300 capitalize">{item.name}: {formatUSD(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de entradas */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-100">Mis activos</h3>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="badge bg-blue-500/20 text-blue-300 cursor-pointer hover:bg-blue-500/30 transition-colors text-sm"
          >
            + Agregar
          </button>
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input
                placeholder="Nombre (ej: Apple)"
                value={form.activo ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.value }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
              <input
                placeholder="Ticker (ej: AAPL)"
                value={form.ticker ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500 font-mono"
              />
              <select
                value={form.tipo ?? "accion"}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoActivo }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="date"
                value={form.fecha ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={form.cantidad ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: Number(e.target.value) }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="Precio de compra (USD)"
                value={form.precio_compra ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, precio_compra: Number(e.target.value) }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
              <input
                placeholder="Exchange (ej: Binance)"
                value={form.exchange ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={agregarEntrada}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {entradas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-3xl mb-2">📋</p>
            <p>Tu portafolio está vacío. Agrega activos para hacer seguimiento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {resumen.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{e.activo}</span>
                    <span className="text-xs font-mono text-slate-400">{e.ticker}</span>
                    <span className="badge bg-slate-700 text-slate-400 text-xs">{e.tipo}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {e.cantidad} @ {formatUSD(e.precio_compra)} · {e.fecha}
                    {e.exchange && ` · ${e.exchange}`}
                  </p>
                </div>
                <div className="text-right">
                  {e.valorActual !== undefined ? (
                    <>
                      <p className="text-sm font-semibold text-slate-100">{formatUSD(e.valorActual)}</p>
                      <p className={`text-xs ${(e.ganancia_perdida ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {(e.ganancia_perdida ?? 0) >= 0 ? "+" : ""}{formatUSD(e.ganancia_perdida ?? 0)}
                        {" "}({(e.ganancia_pct ?? 0).toFixed(1)}%)
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">Precio no disponible</p>
                  )}
                </div>
                <button
                  onClick={() => eliminar(e.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección IA — Recomendaciones */}
      {entradas.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100">🤖 Recomendaciones IA para tu portafolio</h3>
            <button
              onClick={pedirRecomendacionIA}
              disabled={cargandoIA}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              {cargandoIA ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Analizando...
                </span>
              ) : "Analizar con Claude"}
            </button>
          </div>
          {!recomendacionIA && !cargandoIA && (
            <p className="text-sm text-slate-400">
              Claude analizará tu portafolio actual y te dirá: si estás sobre-concentrado en algún sector,
              qué activos complementarían tu estrategia, y si hay señales de venta en lo que tienes.
            </p>
          )}
          {recomendacionIA && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{recomendacionIA}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
