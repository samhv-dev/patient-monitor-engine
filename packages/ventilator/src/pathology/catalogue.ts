// Lung pathology catalogue (rulings R36/R37): one row per condition, weight-of-evidence defaults (`value`) and the
// band the sources span (`lo`–`hi`). Reference patient: passive intubated adult, PBW 70 kg, 8.0 ETT; reference
// settings REF_SETTINGS (VC 490 mL, 14/min, PEEP 5, 60 L/min square, 0.3 s pause) unless a row gives `ref`.
// With them the ventilator shows plateau = PEEP + autoPEEP + VT/C, driving pressure = VT/C, peak − plateau =
// R_insp × 1 L/s; `signature` bands are the clinically reported ranges and the tests require the model inside
// them. Textbook citations: "Miller 10e pdf p. N" (running heads carry no chapter number in the extraction),
// "Co-Existing 8e ch. N p. M", "Dellinger 5e ch. N p. M". `ENG` = engineering judgement, reasoning given; every
// ENG number is a row for Ali's review in docs/physiology/stage-7-parameter-tables.md §4b.
// `wired`: what acts on the field TODAY — 'vent' (ventilator mechanics), 'engine-now' (Stage 3 shunt input),
// 'stage7a' (PVR/HPV/RV: the two-sided heart), 'stage7b' (dead space, diffusion: the lung module), 'not-modelled'.
export interface Band { value: number; lo: number; hi: number }
export interface Cite { field: string; src: string }
export type Wired = 'vent' | 'engine-now' | 'stage7a' | 'stage7b' | 'not-modelled';
export interface LungPathology {
  id: string;
  label: string;
  group: 'normal' | 'obstructive' | 'restrictive' | 'parenchymal' | 'vascular' | 'pleural' | 'airway-device' | 'neuromuscular' | 'special';
  complianceMl: Band;
  rInsp: Band;
  rExp: Band;
  autoPeepTendency: number;
  shunt: Band;
  deadSpaceFraction: Band;
  diffusionFactor: number;
  pvrMultiplier: Band;
  hpvSensitivity: number;
  recruitability: 'high' | 'moderate' | 'low' | 'none';
  recruitP50?: number;
  signature: { plateau: Band; drivingPressure: Band; autoPeep: Band; peakMinusPlateau: Band };
  ref?: { vtMl?: number; rr?: number; peep?: number; pbwKg?: number; flowLpm?: number };
  wired: Partial<Record<'mechanics' | 'shunt' | 'deadSpace' | 'diffusion' | 'pvr' | 'hpv', Wired>>;
  monitor: string;
  pitfall: string;
  sources: Cite[];
  disagreements?: string;
}
export const REF_SETTINGS = { vtMl: 490, rr: 14, peep: 5, flowLpm: 60, pauseS: 0.3, pbwKg: 70 } as const;

const b = (value: number, lo: number, hi: number): Band => ({ value, lo, hi });
const W_STD: LungPathology['wired'] = { mechanics: 'vent', shunt: 'engine-now', deadSpace: 'stage7b', diffusion: 'stage7b', pvr: 'stage7a', hpv: 'stage7a' };
const PV1 = b(1, 1, 1.2);
const NO_AP = b(0, 0, 1);
const S_MECH = 'ENG: the model is linear, so plateau/ΔP/peak−plateau follow from C and R at REF_SETTINGS';
const S_NORMAL_C = 'Dellinger 5e ch. 11 (pdf 226, fig.): respiratory-system compliance at PEEP 5 reported in mL/cmH2O per patient; normal intubated 50–60 (ENG consensus: 50–100 mL/cmH2O quoted across texts)';

export const LUNG_PATHOLOGIES: readonly LungPathology[] = [
  // --- normal, obstructive and airway (Task 9) ---
  {
    id: 'normal', label: 'Normal (intubated adult)', group: 'normal',
    complianceMl: b(55, 45, 70), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: b(1, 1, 1), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 3,
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 6, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Ppeak ≈ 20–25, Pplat ≈ 13–16 cmH2O at 7 mL/kg; square capnogram; SpO2 ≥ 97 % on FiO2 0.4.',
    pitfall: 'Anaesthesia alone creates 5–10 % shunt within minutes (atelectasis): "normal" intubated is not normal awake.',
    sources: [{ field: 'complianceMl', src: S_NORMAL_C }, { field: 'shunt', src: 'Miller 10e pdf p. 341: "Although the SaO2 is usually well maintained with this approach, atelectasis inevitably forms."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'bronchospasm', label: 'Acute bronchospasm / asthma', group: 'obstructive',
    complianceMl: b(50, 35, 60), rInsp: b(30, 20, 50), rExp: b(60, 35, 100), autoPeepTendency: 0.8,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(18, 13, 25), drivingPressure: b(10, 7, 14), autoPeep: b(4, 1, 15), peakMinusPlateau: b(30, 18, 50) },
    wired: W_STD, monitor: 'High peak with a normal-ish plateau (large peak−plateau gap), expiratory flow not returning to zero, shark-fin capnogram.',
    pitfall: 'Raising the rate to fix the CO2 worsens trapping: lengthen expiration, accept hypercapnia.',
    sources: [
      { field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 26: "Signs may include high peak airway pressure, upsloping of the end-tidal carbon dioxide (ETCO2) waveform, wheezing, and desaturation"' },
      { field: 'autoPeepTendency', src: 'Co-Existing 8e ch. 2 p. 32: "air trapping, also called auto-PEEP or dynamic hyperinflation, occurs when positive pressure ventilation is applied and insufficient expiratory time is allowed."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'anaphylaxis-bronchospasm', label: 'Anaphylaxis with bronchospasm', group: 'obstructive',
    complianceMl: b(45, 30, 55), rInsp: b(35, 20, 60), rExp: b(70, 40, 120), autoPeepTendency: 0.8,
    shunt: b(0.1, 0.05, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(19, 13, 26), drivingPressure: b(11, 8, 16), autoPeep: b(4, 1, 15), peakMinusPlateau: b(35, 18, 60) },
    wired: W_STD, monitor: 'Bronchospasm signature plus vasodilatory shock (BP ↓, HR ↑); EtCO2 falls with CO.',
    pitfall: 'Under anaesthesia the first sign is often hypotension or high airway pressure, not rash; wheeze may be absent.',
    sources: [
      { field: 'rInsp', src: 'Co-Existing 8e ch. 31 p. 692: "Manifesting as atypical bronchospasm, wheezing is generally not present."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'copd-gold-1-2', label: 'COPD GOLD 1–2', group: 'obstructive',
    complianceMl: b(60, 50, 75), rInsp: b(15, 12, 20), rExp: b(30, 20, 45), autoPeepTendency: 0.4,
    shunt: b(0.06, 0.03, 0.1), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(1.2, 1, 1.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(13, 10, 17), drivingPressure: b(8, 6, 11), autoPeep: b(1, 0, 4), peakMinusPlateau: b(15, 11, 21) },
    wired: W_STD, monitor: 'Mild peak−plateau gap; small auto-PEEP at 14/min; sloping phase III.',
    pitfall: 'Normal settings are usually safe; trapping appears only with high rates or short Te.',
    sources: [
      { field: 'group', src: 'Co-Existing 8e ch. 2 p. 28: "I: Mild COPD FEV1 ≥ 80% predicted II: Moderate COPD 50% ≤ FEV1 < 80% predicted III: Severe COPD 30% ≤ FEV1 …"' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'copd-gold-3-4', label: 'COPD GOLD 3–4 (emphysema)', group: 'obstructive',
    complianceMl: b(65, 50, 90), rInsp: b(22, 15, 30), rExp: b(60, 35, 100), autoPeepTendency: 0.8,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.5, 0.4, 0.65), diffusionFactor: 0.7, pvrMultiplier: b(1.6, 1.2, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(16, 11, 24), drivingPressure: b(8, 5, 10), autoPeep: b(4, 2, 12), peakMinusPlateau: b(22, 15, 30) },
    wired: W_STD, monitor: 'Auto-PEEP on an expiratory hold; flow not reaching zero; RR ↑ → auto-PEEP ↑ → BP ↓ (dynamic hyperinflation).',
    pitfall: 'Hypotension after intubation is trapped gas until proven otherwise: disconnect and let the patient exhale.',
    sources: [
      { field: 'autoPeepTendency', src: 'Co-Existing 8e ch. 2 p. 32: "This contributes to increased intrathoracic pressure" (dynamic hyperinflation)' },
      { field: 'rExp', src: 'Miller 10e pdf p. 1849: "Patients with low auto-PEEP (<2 cmH2O) will experience a greater increase in total PEEP from a moderate (5 cmH2O) external PEEP than those with a high level of auto-PEEP (>10 cmH2O)."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'cystic-fibrosis', label: 'Cystic fibrosis', group: 'obstructive',
    complianceMl: b(45, 35, 60), rInsp: b(22, 15, 30), rExp: b(40, 25, 60), autoPeepTendency: 0.6,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(1.5, 1.1, 2.5), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(18, 13, 25), drivingPressure: b(11, 8, 14), autoPeep: b(2, 0, 8), peakMinusPlateau: b(22, 15, 30) },
    wired: W_STD, monitor: 'Obstructive signature with secretions; shunt from plugging.',
    pitfall: 'Suction and humidify; secretions change resistance minute to minute.',
    sources: [{ field: 'group', src: 'Co-Existing 8e ch. 3 p. 54 (lung transplant indications table) lists "Chronic obstructive pulmonary disease Cystic fibrosis Idiopathic pulmonary fibrosis Primary pulmonary hypertension"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'tube-obstruction', label: 'Tube obstruction / kink (partial)', group: 'airway-device',
    complianceMl: b(55, 45, 70), rInsp: b(40, 25, 80), rExp: b(50, 30, 100), autoPeepTendency: 0.5,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 20), drivingPressure: b(9, 6, 12), autoPeep: b(1, 0, 8), peakMinusPlateau: b(40, 25, 80) },
    wired: W_STD, monitor: 'Peak rises with a normal plateau (resistive), Pmax alarm; a suction catheter will not pass.',
    pitfall: 'Same ventilator picture as bronchospasm — pass a suction catheter before giving bronchodilators.',
    sources: [{ field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 21: flattened flow–volume loops "distinguish wheezing caused by airway obstruction (i.e., due to a foreign body, tracheal stenosis, or mediastinal tumor) from asthma"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'tracheal-obstruction', label: 'Tracheal stenosis / obstruction', group: 'airway-device',
    complianceMl: b(55, 45, 70), rInsp: b(30, 20, 60), rExp: b(35, 20, 70), autoPeepTendency: 0.3,
    shunt: b(0.05, 0.02, 0.08), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 18), drivingPressure: b(9, 6, 12), autoPeep: b(0, 0, 5), peakMinusPlateau: b(30, 20, 60) },
    wired: W_STD, monitor: 'Fixed resistive load: high peak, normal plateau, slow expiratory flow.',
    pitfall: 'A tube passed beyond the lesion normalises the numbers; above it, nothing improves.',
    sources: [{ field: 'rInsp', src: 'Co-Existing 8e ch. 2 p. 21 (tracheal stenosis flattens the flow–volume loop)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'smoke-co', label: 'Smoke inhalation / CO poisoning', group: 'special',
    complianceMl: b(45, 30, 55), rInsp: b(18, 12, 30), rExp: b(22, 12, 40), autoPeepTendency: 0.3,
    shunt: b(0.12, 0.05, 0.25), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(16, 12, 22), drivingPressure: b(11, 8, 16), autoPeep: b(0, 0, 4), peakMinusPlateau: b(18, 12, 30) },
    wired: W_STD, monitor: 'Airway oedema and bronchospasm; SpO2 reads falsely normal with carboxyhaemoglobin.',
    pitfall: 'Pulse oximetry over-reads with COHb — use co-oximetry; give FiO2 1.0 regardless of SpO2.',
    sources: [{ field: 'pitfall', src: 'ENG: dual-wavelength oximetry reads COHb as oxyhaemoglobin (standard physiology; COHb/SpO2 display is Stage 7c)' }, { field: 'signature', src: S_MECH }],
  },
];
