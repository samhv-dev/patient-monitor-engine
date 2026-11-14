// Plan learner-action-remote.md L13: how the app names a preparation's findings and their sources, in one DOM-free place,
// so the learner's tray (L7), the instructor's card (L9) and the Debrief (L13) say the same words for the same finding.
// Moved here unchanged from remote/bench.ts (sourceText), remote/tray.ts (FINDING_WORDS) and teach2/learner-preps.ts
// (sourcesText and its helpers), which re-export them. The statements and sources are the formulary's; nothing here is
// a clinical statement of its own.
import type { Finding, Formulary, Source } from '@pme/controller';

/** A finding's kind in words (the tray's, the card's and the Debrief's heading of a finding). */
export const FINDING_WORDS: Readonly<Record<Finding['kind'], string>> = {
  incompatible: 'Incompatible',
  conditional: 'Compatible only under conditions',
  notTested: 'Not tested together',
  wrongDiluent: 'Diluent not listed in the label',
};
/** A finding the formulary holds no statement for, and one no source speaks for. */
export const NO_STATEMENT = 'no statement in the formulary';
export const NO_SOURCE = 'no source speaks';

/** A source as the phone names it (the finding after the notice, a product's label). */
export function sourceText(s: Source | undefined, key: string): string {
  if (!s) return key;
  if (s.kind === 'stabilis') return `Stabilis ${s.id}`;
  if (s.kind === 'trissel') return `Trissel ${s.edition}, p. ${s.page}`;
  if (s.kind === 'monograph') return `${s.product} (${s.issuer})`;
  return s.citation;
}

/** "p. 350" for a page number; a page the reader wrote out ("PDF p. 1859 (page stamp 1839)") as written. */
const pageText = (page: number | string): string => (typeof page === 'number' || /^\d+$/.test(page) ? `p. ${page}` : page);

/** Trissel 2013's reading of the statement behind a finding, as the card says it ("Trissel 2013 p. 1859 agrees"). */
function crossText(x: Finding, f: Formulary): string | null {
  const e = f.drugs[x.drugId];
  const st = x.against === 'diluent' ? e?.diluents.find((d) => d.id === x.other)?.compat : e?.admixtures.find((a) => a.with === x.other && a.src === x.src);
  const c = st?.crossCheck;
  if (!c) return null;
  if (c.trissel === 'not listed') return 'not in Trissel 2013';
  const s = c.src ? f.sources[c.src] : undefined;
  const page = s?.kind === 'trissel' ? ` ${pageText(s.page)}` : '';
  return `Trissel 2013${page} ${c.trissel}${c.trissel === 'differs' && c.ruling ? `; the entry follows ${c.ruling.follows}` : ''}`;
}

/** A finding's sources as the card names them, its source of record then Trissel's cross-check (the source key alone while the formulary is not loaded). */
export function sourcesText(x: Finding, f: Formulary | null): string {
  if (x.src === null) return `(${NO_SOURCE})`;
  if (!f) return `(${x.src})`;
  const s: Source | undefined = f.sources[x.src];
  const main = s?.kind === 'trissel' ? `Trissel 2013 ${pageText(s.page)}` : sourceText(s, x.src);
  const cross = s?.kind === 'trissel' ? null : crossText(x, f);
  return `(${[main, cross].filter(Boolean).join('; ')})`;
}
