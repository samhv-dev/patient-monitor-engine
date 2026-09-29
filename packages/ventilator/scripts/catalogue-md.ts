// Prints the engine's lung-pathology data table as docs/physiology/stage-v-lung-pathology-data.md (R36; R41 file rule:
// the clinical review document docs/physiology/stage-7-lung-pathology-catalogue.md is drafted separately and is never
// written by this script; the orchestrator reconciles data rows ⊂ catalogue after Ali's review).
// Stage V.1: the numbers are the 7b lungs' (LUNG_PATHOLOGIES is generated from ventReference), with each row's engine
// condition as the link profile carries it, its pleural pressure, and the ventilator's reference run on those numbers.
// Run (Stage V.1: the catalogue imports @pme/engine-core, whose JSON imports plain `node --experimental-strip-types` cannot
// load, so a Vite SSR runner loads this module): node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md
// test/catalogue-md.test.ts fails when the committed table differs from this output (CI).
import { LUNG_PATHOLOGIES, REF_SETTINGS, type Band } from '../src/pathology/catalogue.ts';
import { referenceRun } from '../src/pathology/mechanics.ts';
import { lungConditionsOf } from '../src/link/profiles.ts';

const f = (b: Band) => `${b.value} (${b.lo}–${b.hi})`;
const r1 = (x: number) => x.toFixed(1);
export function renderCatalogueMd(): string {
const out: string[] = [
  '# Stage V lung-pathology data (R36, R41; regenerated in Stage V.1 from the Stage 7b lungs) — the 39 rows the ventilator link runs on',
  '',
  'The engine\'s data table, for Ali\'s review alongside the clinical catalogue `docs/physiology/stage-7-lung-pathology-catalogue.md` (§4b), which this file does not replace; the orchestrator reconciles the two (data rows ⊂ catalogue) after the review.',
  '',
  `Generated from \`packages/ventilator/src/pathology/catalogue.ts\` — edit the source, not this table. C, R, shunt, VD/VT and pleural pressure of every mapped row are the Stage 7b lung module's own (\`ventReference\` of the row's engine condition at its PBW, \`packages/engine-core/data/lung-pathology.ts\`; the shunt is the PEEP-0 value — a lung-water shunt falls ×(1 − 0.04·PEEP) in the engine, so cardiogenic oedema's 0.175 is 0.14 at the reference PEEP 5); the neonatal row and the two unmapped rows keep their authored values. Each link profile carries the "Engine condition" as \`patient.lungConditions\`, and the ventilator reads \`lungState\` as absolute values (Stage V.1). Reference: passive intubated adult, PBW ${REF_SETTINGS.pbwKg} kg; VC ${REF_SETTINGS.vtMl} mL, ${REF_SETTINGS.rr}/min, PEEP ${REF_SETTINGS.peep}, ${REF_SETTINGS.flowLpm} L/min, pause ${REF_SETTINGS.pauseS} s. Values: default (band). Regenerate: \`node packages/ventilator/scripts/catalogue-md.mjs > docs/physiology/stage-v-lung-pathology-data.md\` (\`packages/ventilator/test/catalogue-md.test.ts\` checks the committed copy). "Reference run" = the ventilator's own 60 s run on the row (plateau / ΔP / auto-PEEP / peak − plateau, cmH2O). "ENG" in a source = engineering judgement for review.`,
  '',
  '| Condition | Engine condition | C mL/cmH2O | R insp / exp | Auto-PEEP tend. | Pleural cmH2O | Shunt | VD/VT | Diffusion | PVR × | HPV | Recruit. | Plateau / ΔP / P peak−plat (bands) | Reference run | Not acting yet | Sources | Question for Ali |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of LUNG_PATHOLOGIES) {
  const later = Object.entries(r.wired).filter(([, w]) => w !== 'vent' && w !== 'engine-now').map(([k, w]) => `${k} (${w})`).join(', ');
  const src = r.sources.map((s) => `${s.field}: ${s.src}`).join(' · ').replace(/\|/g, '/');
  const eng = r.sources.some((s) => s.src.startsWith('ENG') || s.src.includes('ENG'));
  const lc = lungConditionsOf(r.id).map((c) => `${c.id} ${c.severity}${c.side ? ` ${c.side}` : ''}${c.recruitFrac !== undefined ? ` (recruit ${c.recruitFrac})` : ''}`).join(', ') || '—';
  const s = referenceRun(r).sig;
  out.push(`| ${r.label} | ${lc} | ${f(r.complianceMl)} | ${f(r.rInsp)} / ${f(r.rExp)} | ${r.autoPeepTendency} | ${r.pleuralCmH2O ?? 0} | ${f(r.shunt)} | ${f(r.deadSpaceFraction)} | ${r.diffusionFactor} | ${f(r.pvrMultiplier)} | ${r.hpvSensitivity} | ${r.recruitability}${r.recruitP50 ? ` (P50 ${r.recruitP50})` : ''} | ${f(r.signature.plateau)} / ${f(r.signature.drivingPressure)} / ${f(r.signature.peakMinusPlateau)} | ${r1(s.plateau)} / ${r1(s.drivingPressure)} / ${r1(s.autoPeep)} / ${r1(s.peakMinusPlateau)} | ${later || '—'} | ${src} | ${eng ? 'ENG values — confirm or correct' : ''}${r.disagreements ? ` Disagreement: ${r.disagreements}` : ''} |`);
}
return out.join('\n');
}
