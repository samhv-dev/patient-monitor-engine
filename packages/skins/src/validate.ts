// Runtime validation with ajv (MIT, NOTICES). Kept out of src/index.ts so the renderer/IIFE bundle, which only
// resolves shipped skins, never pulls ajv in: import it as '@pme/skins/validate'.
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import { presetSchema, skinSchema, skinSourceSchema, themeSchema } from './schema.ts';

const ajv = new Ajv({ allErrors: true, strict: true, strictTypes: false, strictRequired: false });
const compiled: Record<'skin' | 'skinSource' | 'theme' | 'preset', ValidateFunction> = {
  skin: ajv.compile(skinSchema),
  skinSource: ajv.compile(skinSourceSchema),
  theme: ajv.compile(themeSchema),
  preset: ajv.compile(presetSchema),
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const fmt = (e: ErrorObject): string =>
  `${e.instancePath || '/'} ${e.message ?? ''}${e.keyword === 'additionalProperties' ? ` (${String((e.params as { additionalProperty?: string }).additionalProperty)})` : ''}`;

export function validate(kind: keyof typeof compiled, doc: unknown): ValidationResult {
  const fn = compiled[kind];
  const ok = fn(doc) as boolean;
  return { ok, errors: ok ? [] : (fn.errors ?? []).map(fmt) };
}
