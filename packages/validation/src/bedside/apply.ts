// Bedside results (the checklist page's download) → docs/validation/bedside/<date>.md with a verdict table and the
// skin-provenance queue: every 'close'/'wrong' item lists the saadat-like skin fields to revisit, with Ali's
// observation as the proposed source (tag "observed", research/06 §7).
import { BEDSIDE, type BedsideResults } from './checklist.ts';

export interface ProvenanceUpdate { field: string; item: string; verdict: string; observed: string; engine: string }

export function provenanceQueue(r: BedsideResults): ProvenanceUpdate[] {
  const out: ProvenanceUpdate[] = [];
  for (const x of r.results) {
    if (x.verdict !== 'close' && x.verdict !== 'wrong') continue;
    const item = BEDSIDE.find((b) => b.id === x.id);
    for (const field of item?.skinFields ?? []) out.push({ field, item: x.id, verdict: x.verdict, observed: x.observed, engine: x.engineMeasured });
  }
  return out;
}

export function bedsideMarkdown(r: BedsideResults): string {
  const L = [`# Saadat bedside check — ${r.date}`, '', `Device: ${r.device} (firmware ${r.firmware || 'not recorded'}); observer: ${r.observer}; engine skin: ${r.skin}. Screens only, no patient identifiers (R12).`, '',
    '| Item | Verdict | At the monitor | Engine | Note |', '|---|---|---|---|---|'];
  for (const b of BEDSIDE) {
    const x = r.results.find((y) => y.id === b.id);
    L.push(`| ${b.title} | ${x?.verdict ?? 'not-checked'} | ${x?.observed ?? ''} | ${x?.engineMeasured ?? ''} | ${x?.note ?? ''} |`);
  }
  const q = provenanceQueue(r);
  L.push('', '## Skin provenance queue', '', q.length ? '| Skin field | From item | Verdict | Observed (proposed source) | Engine now |' : 'Nothing to update: every checked item matches.');
  if (q.length) {
    L.push('|---|---|---|---|---|');
    for (const u of q) L.push(`| \`${u.field}\` | ${u.item} | ${u.verdict} | ${u.observed} | ${u.engine} |`);
  }
  return `${L.join('\n')}\n`;
}
