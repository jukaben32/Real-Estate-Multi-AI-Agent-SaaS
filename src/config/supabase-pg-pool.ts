/**
 * Pool real de pg (instancia de Pool) cuyos métodos connect/query se redirigen
 * al API SQL de Supabase por HTTPS.
 *
 * Se usa con @prisma/adapter-pg, que SABE mapear los dataTypeID de Postgres al
 * enum ColumnType interno de Prisma (esto es justo lo que nos faltaba: tipos reales).
 *
 * Al ser una instancia real de Pool, pasa el cheque `instanceof Pool` que hace
 * @prisma/adapter-pg. Solo sobrescribimos connect/query para hablar con Supabase.
 *
 * Tu red (Tricom) no enruta IPv6 y el pooler TCP de Supabase no reconoce el usuario,
 * así que usamos HTTPS con tu access token. El backend no cambia.
 */

import { Pool } from "pg";
import { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } from "./env-adapter-config";

const API_URL = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// OIDs reales de Postgres (el adapter-pg los mapea a ColumnType de Prisma)
const OID = {
  bool: 16,
  int4: 23,
  int8: 20,
  text: 25,
  json: 114,
  jsonb: 3802,
  float8: 701,
  numeric: 1700,
  timestamptz: 1184,
  date: 1082,
  uuid: 2950,
  textArray: 1009, // _text (text[])
};

function inferOid(value: unknown): number {
  if (value === null || value === undefined) return OID.text;
  if (typeof value === "boolean") return OID.bool;
  if (typeof value === "number") return Number.isInteger(value) ? OID.int8 : OID.numeric;
  if (Array.isArray(value)) return OID.textArray; // array de Postgres (String[])
  if (typeof value === "object") return OID.jsonb;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) return OID.timestamptz;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return OID.date;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return OID.uuid;
  return OID.text;
}

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Array.isArray(value)) {
    const items = value.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",");
    return `'{${items}}'`;
  }
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function interpolate(sql: string, args: unknown[]): string {
  if (!args || args.length === 0) return sql;
  return sql.replace(/\$(\d+)/g, (_, n) => {
    const idx = parseInt(n, 10) - 1;
    return escapeValue(args[idx]);
  });
}

async function runSql(sql: string): Promise<any[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase SQL API (${res.status}): ${text}`);
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Ejecuta una query en formato pg y devuelve { fields, rows } como espera adapter-pg.
 * adapter-pg llama con un objeto de config { text, values, rowMode: "array", types }.
 * Debemos devolver:
 *   - fields: [{ name, dataTypeID }]   (dataTypeID = OID de Postgres)
 *   - rows:   [[val, val, ...], ...]   (arrays, porque rowMode = "array")
 */
async function pgQuery(config: any): Promise<{ fields: any[]; rows: any[][] }> {
  // adapter-pg siempre pasa un objeto { text, values }
  const text: string = typeof config === "string" ? config : config?.text ?? "";
  const values: unknown[] = (typeof config === "object" && config?.values) || [];

  const finalSql = interpolate(text, values);
  const objRows = await runSql(finalSql);

  if (objRows.length === 0) {
    // Sin filas: derivar nombres de columna del SELECT si es posible
    return { fields: [], rows: [] };
  }

  const columnNames = Object.keys(objRows[0]);
  const fields = columnNames.map((name) => ({ name, dataTypeID: inferOid(objRows[0][name]) }));
  // rowMode "array": cada fila es un array de valores en el orden de columnNames
  const rows = objRows.map((row) => columnNames.map((name) => row[name]));
  return { fields, rows };
}

/** Cliente mock que el adapter-pg usa tras pool.connect(). */
class MockClient {
  async query(config: any): Promise<{ fields: any[]; rows: any[][] }> {
    return pgQuery(config);
  }
  release(): void {}
  on(): void {}
}

/** Crea un Pool real de pg y redirige connect/query a Supabase. */
export function createSupabasePool(): Pool {
  const pool = new Pool({} as any);
  // Redirigir connect() para que devuelva nuestro MockClient
  (pool as any).connect = async (): Promise<MockClient> => new MockClient();
  // Redirigir query() directo también
  (pool as any).query = async (config: any): Promise<{ fields: any[]; rows: any[][] }> => pgQuery(config);
  return pool;
}
