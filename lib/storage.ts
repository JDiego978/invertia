"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { ResultadoAnalisis, EntradaPortafolio, Alerta } from "./types";

const DB_NAME = "invertia-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("historial")) {
          const histStore = db.createObjectStore("historial", { keyPath: "id" });
          histStore.createIndex("timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("portafolio")) {
          db.createObjectStore("portafolio", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("alertas")) {
          db.createObjectStore("alertas", { keyPath: "id" });
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
