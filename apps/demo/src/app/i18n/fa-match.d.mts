// Types of fa-match.mjs (the one Persian matcher, plan D11).
/** One entry of docs/showcase/i18n/fa-debrief.json. */
export interface FaEntry {
  en: string;
  fa: string | null;
  reviewed: boolean;
  source?: string;
  id?: string;
  kind?: string;
}
export interface FaTable {
  schema: string;
  groups: Record<string, FaEntry[]>;
  strings: FaEntry[];
  templates: FaEntry[];
  [k: string]: unknown;
}
export type FaPart = { lit: string; ph?: undefined } | { ph: string; lit?: undefined };
export declare const lcFirst: (s: string) => string;
export declare const parse: (en: string) => FaPart[];
export declare const TYPED: Readonly<Record<'t' | 'span' | 'n' | 'c' | 'u' | 'code', RegExp>>;
export declare const FA_DIGITS: string;
export declare const faDigits: (s: string | number) => string;
export declare const spanFa: (s: string) => string;
export declare function match(parts: FaPart[], i: number, s: string, pos: number, caps: Array<[string, string]>): Generator<Array<[string, string]>>;
export interface FaMatcher {
  /** The Persian of `en` (exact string, a group's word, a template), or null; the entries used are pushed onto `used`. */
  tr(en: string, used: FaEntry[], missing: Set<string>, kind?: string): string | null;
  /** One group's Persian for `en` (also with its first letter lowered), or null. */
  inGroup(g: string, en: string, used: FaEntry[]): string | null;
}
export declare function faMatcher(table: FaTable): FaMatcher;
