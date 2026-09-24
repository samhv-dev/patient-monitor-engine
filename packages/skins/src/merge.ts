// Deep merge for skin data: plain objects merge key by key, arrays and scalars (and null) replace.
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function deepMerge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? structuredClone(base) : structuredClone(over)) as T;
  const out: Record<string, unknown> = structuredClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = k in out && isObj(out[k]) && isObj(v) ? deepMerge(out[k], v) : structuredClone(v);
  }
  return out as T;
}
