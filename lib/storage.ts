"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { ResultadoAnalisis, EntradaPortafolio, Alerta, Prediccion } from "./types";

const DB_NAME = "invertia-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const histStore = db.createObjectStore("historial", { keyPath: "id" });
          histStore.createIndex("timestamp", "timestamp");
          db.createObjectStore("portafolio", { keyPath: "id" });
          db.createObjectStore("alertas", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          const predStore = db.createObjectStore("predicciones", { keyPath: "id" });
          predStore.createIndex("fecha_prediccion", "fecha_prediccion");
          predStore.createIndex("ticker", "ticker");
        }
      },
    });
  }
  return dbPromise;
}

// ─── Historial ───────────────────────────────────────────────────────────────

export async function guardarAnalisis(resultado: ResultadoAnalisis): Promise<string> {
  const db = await getDB();
  const id = `analisis-${Date.now()}`;
  await db.put("historial", { ...resultado, id });
  return id;
}

export async function obtenerHistorial(): Promise<(ResultadoAnalisis & { id: string })[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex("historial", "timestamp");
  return items.reverse();
}

export async function obtenerAnalisis(id: string): Promise<ResultadoAnalisis | undefined> {
  const db = await getDB();
  return db.get("historial", id);
}

export async function eliminarAnalisis(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("historial", id);
}

// ─── Portafolio ───────────────────────────────────────────────────────────────

export async function guardarEntradaPortafolio(entrada: EntradaPortafolio): Promise<void> {
  const db = await getDB();
  await db.put("portafolio", entrada);
}

export async function obtenerPortafolio(): Promise<EntradaPortafolio[]> {
  const db = await getDB();
  return db.getAll("portafolio");
}

export async function eliminarEntradaPortafolio(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("portafolio", id);
}

// ─── Alertas ─────────────────────────────────────────────────────────────────

export async function guardarAlerta(alerta: Alerta): Promise<void> {
  const db = await getDB();
  await db.put("alertas", alerta);
}

export async function obtenerAlertas(): Promise<Alerta[]> {
  const db = await getDB();
  return db.getAll("alertas");
}

export async function eliminarAlerta(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("alertas", id);
}

// ─── Predicciones ────────────────────────────────────────────────────────────

export async function guardarPrediccion(prediccion: Prediccion): Promise<void> {
  const db = await getDB();
  await db.put("predicciones", prediccion);
}

export async function obtenerPredicciones(): Promise<Prediccion[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex("predicciones", "fecha_prediccion");
  return items.reverse();
}

export async function actualizarPrediccion(prediccion: Prediccion): Promise<void> {
  const db = await getDB();
  await db.put("predicciones", prediccion);
}

// ─── Límite diario de análisis ───────────────────────────────────────────────

const LIMITE_RAPIDO = 20;
const LIMITE_PROFUNDO = 5;

function claveHoy(tipo: string) {
  return `limite_${tipo}_${new Date().toISOString().slice(0, 10)}`;
}

export function obtenerContadorHoy(tipo: "rapido" | "profundo"): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(claveHoy(tipo)) ?? "0", 10);
}

export function incrementarContador(tipo: "rapido" | "profundo"): void {
  if (typeof window === "undefined") return;
  const actual = obtenerContadorHoy(tipo);
  localStorage.setItem(claveHoy(tipo), String(actual + 1));
}

export function limiteSuperado(tipo: "rapido" | "profundo"): boolean {
  const limite = tipo === "rapido" ? LIMITE_RAPIDO : LIMITE_PROFUNDO;
  return obtenerContadorHoy(tipo) >= limite;
}

export function analisisRestantes(tipo: "rapido" | "profundo"): number {
  const limite = tipo === "rapido" ? LIMITE_RAPIDO : LIMITE_PROFUNDO;
  return Math.max(0, limite - obtenerContadorHoy(tipo));
}
