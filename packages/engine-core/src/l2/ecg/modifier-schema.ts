// setModifiers validation (brief §5 ranges). Returns a human-readable reason, or undefined when the patch is valid.
import type { ModifiersPatch, PvcPattern, StTerritory } from '../../types.ts';

const KEYS = new Set([
  'pvc', 'pac', 'pjc', 'rsa', 'hrvScale', 'qtc', 'bbb', 'axisDeg', 'transitionLead', 'lowVoltage', 'lvh', 'st',
  'ischaemicDepressionMv', 'tInversion', 'longQT', 'brugada1', 'digoxin', 'alternans', 'k', 'tempC', 'overrides',
  'patientSeed', 'morphologyVariation', 'epinephrineAtS', 'tcp', 'artefact',
]);
const ART_KEYS = new Set(['noise', 'wander', 'mains', 'emg', 'shiver', 'motion', 'leadOff', 'electrosurgery', 'cpr', 'shock']);
const PVC_PATTERNS: readonly PvcPattern[] = ['single', 'bigeminy', 'trigeminy', 'couplet', 'triplet', 'run'];
const TERRITORIES: readonly StTerritory[] = ['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'];

const inRange = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function validateModifiers(m: ModifiersPatch): string | undefined {
  const bad = Object.keys(m).filter((k) => !KEYS.has(k));
  if (bad.length) return `unknown modifiers: ${bad.join(', ')}`;
  if (m.pvc) {
    if (!PVC_PATTERNS.includes(m.pvc.pattern)) return `pvc.pattern must be one of ${PVC_PATTERNS.join(', ')}`;
    if (!inRange(m.pvc.probability, 0, 0.9)) return 'pvc.probability must be 0–0.9';
    if (m.pvc.runLength !== undefined && !inRange(m.pvc.runLength, 3, 30)) return 'pvc.runLength must be 3–30';
  }
  if (m.pac && !inRange(m.pac.probability, 0, 0.9)) return 'pac.probability must be 0–0.9';
  if (m.pjc && !inRange(m.pjc.probability, 0, 0.9)) return 'pjc.probability must be 0–0.9';
  if (m.rsa !== undefined && !inRange(m.rsa, 0, 1)) return 'rsa must be 0–1';
  if (m.hrvScale !== undefined && !inRange(m.hrvScale, 0, 3)) return 'hrvScale must be 0–3';
  if (m.qtc !== undefined && !inRange(m.qtc, 300, 650)) return 'qtc must be 300–650 ms';
  if (m.bbb !== undefined && !['none', 'rbbb', 'lbbb'].includes(m.bbb)) return 'bbb must be none, rbbb or lbbb';
  if (m.axisDeg !== undefined && m.axisDeg !== null && !inRange(m.axisDeg, -150, 180)) return 'axisDeg must be −150…180';
  if (m.transitionLead !== undefined && m.transitionLead !== null && !inRange(m.transitionLead, 1.5, 5.5)) return 'transitionLead must be 1.5–5.5';
  if (m.lowVoltage !== undefined && !inRange(m.lowVoltage, 0.3, 1)) return 'lowVoltage must be 0.3–1';
  if (m.st) {
    if (!TERRITORIES.includes(m.st.territory)) return `st.territory must be one of ${TERRITORIES.join(', ')}`;
    if (!inRange(m.st.mm, 0.5, 4)) return 'st.mm must be 0.5–4';
  }
  if (m.ischaemicDepressionMv !== undefined && !inRange(m.ischaemicDepressionMv, -0.3, 0)) return 'ischaemicDepressionMv must be −0.3…0';
  if (m.tInversion !== undefined && !inRange(m.tInversion, 0, 1)) return 'tInversion must be 0–1';
  if (m.alternans !== undefined && !inRange(m.alternans, 0, 0.5)) return 'alternans must be 0–0.5';
  if (m.k !== undefined && !inRange(m.k, 1.5, 10)) return 'k must be 1.5–10 mmol/L';
  if (m.tempC !== undefined && !inRange(m.tempC, 20, 43)) return 'tempC must be 20–43 °C';
  if (m.overrides) {
    const o = m.overrides;
    if (o.qrsMs !== undefined && !inRange(o.qrsMs, 60, 300)) return 'overrides.qrsMs must be 60–300';
    if (o.qtMs !== undefined && !inRange(o.qtMs, 200, 700)) return 'overrides.qtMs must be 200–700';
    if (o.prMs !== undefined && !inRange(o.prMs, 80, 400)) return 'overrides.prMs must be 80–400';
  }
  if (m.patientSeed !== undefined && !(Number.isInteger(m.patientSeed) && m.patientSeed >= 0)) return 'patientSeed must be a non-negative integer';
  if (m.morphologyVariation !== undefined && !inRange(m.morphologyVariation, 0, 1)) return 'morphologyVariation must be 0–1';
  if (m.epinephrineAtS !== undefined && m.epinephrineAtS !== null && !inRange(m.epinephrineAtS, 0, 1e9)) return 'epinephrineAtS must be a sim time ≥ 0';
  if (m.tcp) {
    if (m.tcp.mode !== 'demand' && m.tcp.mode !== 'fixed') return 'tcp.mode must be demand or fixed';
    if (!inRange(m.tcp.ratePpm, 30, 180)) return 'tcp.ratePpm must be 30–180';
    if (!inRange(m.tcp.mA, 0, 200)) return 'tcp.mA must be 0–200';
    if (!inRange(m.tcp.thresholdMa, 0, 200)) return 'tcp.thresholdMa must be 0–200';
  }
  const a = m.artefact;
  if (a) {
    const badA = Object.keys(a).filter((k) => !ART_KEYS.has(k));
    if (badA.length) return `unknown artefact keys: ${badA.join(', ')}`;
    if (a.noise !== undefined && !inRange(a.noise, 0, 10)) return 'artefact.noise must be 0–10'; // Stage 1.1 range
    for (const k of ['wander', 'mains', 'emg', 'shiver', 'motion'] as const) {
      if (a[k] !== undefined && !inRange(a[k], 0, 1)) return `artefact.${k} must be 0–1`;
    }
    if (a.leadOff !== undefined && typeof a.leadOff !== 'boolean') return 'artefact.leadOff must be boolean';
    if (a.cpr && (!inRange(a.cpr.rateCpm, 60, 160) || !inRange(a.cpr.depth, 0, 1))) return 'artefact.cpr needs rateCpm 60–160 and depth 0–1';
    if (a.shock && (!inRange(a.shock.atS, 0, 1e9) || !inRange(a.shock.energyJ, 1, 400))) return 'artefact.shock needs atS ≥ 0 and energyJ 1–400';
    if (a.electrosurgery && (!inRange(a.electrosurgery.atS, 0, 1e9) || !inRange(a.electrosurgery.durationS, 0.1, 10))) {
      return 'artefact.electrosurgery needs atS ≥ 0 and durationS 0.1–10';
    }
  }
  return undefined;
}
