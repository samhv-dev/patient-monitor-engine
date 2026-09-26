// Prints the engine's lung-pathology data table as docs/physiology/stage-v-lung-pathology-data.md (R36; R41 file rule:
// the clinical review document docs/physiology/stage-7-lung-pathology-catalogue.md is drafted separately and is never
// written by this script; the orchestrator reconciles data rows ⊂ catalogue after Ali's review).
// Run: node --experimental-strip-types packages/ventilator/scripts/catalogue-md.ts > docs/physiology/stage-v-lung-pathology-data.md
import { LUNG_PATHOLOGIES, REF_SETTINGS, type Band } from '../src/pathology/catalogue.ts';

const f = (b: Band) => `${b.value} (${b.lo}–${b.hi})`;
const out: string[] = [
  '# Stage V lung-pathology data (R36, R41) — the 39 rows the ventilator link runs on',
  '',
  'The engine\'s data table, for Ali\'s review alongside the clinical catalogue `docs/physiology/stage-7-lung-pathology-catalogue.md` (§4b), which this file does not replace; the orchestrator reconciles the two (data rows ⊂ catalogue) after the review.',
  '',
  `Generated from \`packages/ventilator/src/pathology/catalogue.ts\` — edit the source, not this table. Reference: passive intubated adult, PBW ${REF_SETTINGS.pbwKg} kg; VC ${REF_SETTINGS.vtMl} mL, ${REF_SETTINGS.rr}/min, PEEP ${REF_SETTINGS.peep}, ${REF_SETTINGS.flowLpm} L/min, pause ${REF_SETTINGS.pauseS} s. Values: default (band). "ENG" in a source = engineering judgement for review.`,
  '',
  '| Condition | C mL/cmH2O | R insp / exp | Auto-PEEP tend. | Shunt | VD/VT | Diffusion | PVR × | HPV | Recruit. | Plateau / ΔP / P peak−plat | Not acting yet | Sources | Question for Ali |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of LUNG_PATHOLOGIES) {
  const later = Object.entries(r.wired).filter(([, w]) => w !== 'vent' && w !== 'engine-now').map(([k, w]) => `${k} (${w})`).join(', ');
  const src = r.sources.map((s) => `${s.field}: ${s.src}`).join(' · ').replace(/\|/g, '/');
  const eng = r.sources.some((s) => s.src.startsWith('ENG') || s.src.includes('ENG'));
  out.push(`| ${r.label} | ${f(r.complianceMl)} | ${f(r.rInsp)} / ${f(r.rExp)} | ${r.autoPeepTendency} | ${f(r.shunt)} | ${f(r.deadSpaceFraction)} | ${r.diffusionFactor} | ${f(r.pvrMultiplier)} | ${r.hpvSensitivity} | ${r.recruitability}${r.recruitP50 ? ` (P50 ${r.recruitP50})` : ''} | ${f(r.signature.plateau)} / ${f(r.signature.drivingPressure)} / ${f(r.signature.peakMinusPlateau)} | ${later} | ${src} | ${eng ? 'ENG values — confirm or correct' : ''}${r.disagreements ? ` Disagreement: ${r.disagreements}` : ''} |`);
}
console.log(out.join('\n'));
