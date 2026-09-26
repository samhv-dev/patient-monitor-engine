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
  // --- parenchymal and restrictive (Task 10) ---
  {
    id: 'ards-mild', label: 'ARDS — Berlin mild', group: 'parenchymal',
    complianceMl: b(40, 32, 50), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.5, 0.4, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.3, 1, 1.8), hpvSensitivity: 0.7,
    recruitability: 'moderate', recruitP50: 8,
    signature: { plateau: b(17, 14, 22), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 9, 16) },
    wired: W_STD, monitor: 'P/F 200–300 on PEEP ≥ 5; ΔP 10–15 at 6–7 mL/kg.',
    pitfall: 'Keep ΔP ≤ 15 and Pplat ≤ 30; the P/F category depends on the PEEP it was measured at.',
    sources: [
      { field: 'signature', src: 'Miller 10e pdf p. 1851: "titrate PEEP between 5 and 10 cmH2O to maximize compliance while maintaining a driving pressure (plateau pressure-PEEP) ≤15 cmH2O."' },
      { field: 'shunt', src: 'Dellinger 5e ch. 36 p. 595: "there should be a minimum of 5 cm H2O PEEP and 10 cm H2O in those patients with severe ARDS (Pao2/FIO2 < 100)." (Berlin grading; shunt fractions ENG from P/F bands)' },
    ],
  },
  {
    id: 'ards-moderate', label: 'ARDS — Berlin moderate', group: 'parenchymal',
    complianceMl: b(32, 25, 40), rInsp: b(13, 10, 16), rExp: b(13, 10, 16), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.55, 0.45, 0.65), diffusionFactor: 1, pvrMultiplier: b(1.5, 1.2, 2.2), hpvSensitivity: 0.6,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(20, 16, 27), drivingPressure: b(15, 12, 20), autoPeep: NO_AP, peakMinusPlateau: b(13, 10, 16) },
    wired: W_STD, monitor: 'P/F 100–200; SpO2 responds to PEEP over minutes (recruitment) and falls fast when PEEP is dropped.',
    pitfall: 'A PEEP step that raises SpO2 but also ΔP means overdistension, not recruitment.',
    sources: [
      { field: 'signature', src: 'Miller 10e pdf p. 1438 cites Amato, NEJM 2015;372:747 ("Driving pressure and survival in the acute respiratory distress syndrome"); ΔP > 15 marks risk (ENG band from that paper\'s groups)' },
      { field: 'recruitP50', src: 'ENG: half-recruitment at total PEEP ≈ 10 cmH2O, midway through the 5–15 cmH2O range trials titrate over (Dellinger 5e ch. 36 p. 595)' },
    ],
  },
  {
    id: 'ards-severe-recruitable', label: 'ARDS — severe, recruitable', group: 'parenchymal',
    complianceMl: b(25, 18, 32), rInsp: b(15, 12, 18), rExp: b(15, 12, 18), autoPeepTendency: 0,
    shunt: b(0.4, 0.25, 0.5), deadSpaceFraction: b(0.6, 0.5, 0.7), diffusionFactor: 1, pvrMultiplier: b(1.8, 1.3, 2.5), hpvSensitivity: 0.5,
    recruitability: 'high', recruitP50: 12,
    signature: { plateau: b(25, 20, 32), drivingPressure: b(20, 15, 27), autoPeep: NO_AP, peakMinusPlateau: b(15, 12, 18) },
    wired: W_STD, monitor: 'P/F < 100; high PEEP improves SpO2 AND compliance (ΔP falls).',
    pitfall: 'Recruitment takes tens of seconds to minutes; derecruitment on disconnection takes seconds.',
    sources: [{ field: 'recruitability', src: 'Dellinger 5e ch. 9 (pdf 200) cites Meade, JAMA 2008;299:637 ("low tidal volumes, recruitment maneuvers, and high positive end-expiratory pressure")' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'ards-severe-nonrecruitable', label: 'ARDS — severe, non-recruitable', group: 'parenchymal',
    complianceMl: b(22, 15, 30), rInsp: b(15, 12, 18), rExp: b(15, 12, 18), autoPeepTendency: 0,
    shunt: b(0.4, 0.35, 0.45), deadSpaceFraction: b(0.65, 0.55, 0.75), diffusionFactor: 0.9, pvrMultiplier: b(2, 1.5, 3), hpvSensitivity: 0.5,
    recruitability: 'low', recruitP50: 20,
    signature: { plateau: b(27, 20, 35), drivingPressure: b(22, 16, 33), autoPeep: NO_AP, peakMinusPlateau: b(15, 12, 18) },
    wired: W_STD, monitor: 'Raising PEEP raises plateau and ΔP, SpO2 barely moves, BP falls.',
    pitfall: 'High PEEP here only overdistends and depresses CO — the reason PEEP must be titrated, not prescribed.',
    sources: [{ field: 'recruitability', src: 'ENG: the non-recruitable phenotype of the recruitment trials (Dellinger 5e ch. 36); shunt band narrow because PEEP barely changes it' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'fibrosis-ild', label: 'Pulmonary fibrosis / ILD', group: 'restrictive',
    complianceMl: b(30, 20, 40), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.5, pvrMultiplier: b(1.8, 1.2, 3), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(21, 16, 30), drivingPressure: b(16, 12, 25), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'High plateau and driving pressure at a normal VT; desaturates fast (low FRC, diffusion limit); PEEP does not help.',
    pitfall: 'Driving pressure is high at "normal" VT — use smaller VT and higher RR; no recruitable lung.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 p. 47: "ILD is a term used for a group of diseases with similar presentation" (chronic intrinsic restrictive lung disease; decreased compliance and diffusing capacity)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'scleroderma', label: 'Scleroderma (ILD + PH + stiff chest wall)', group: 'restrictive',
    complianceMl: b(33, 22, 45), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.55, pvrMultiplier: b(2.5, 1.5, 5), hpvSensitivity: 1.2,
    recruitability: 'none',
    signature: { plateau: b(20, 15, 28), drivingPressure: b(15, 10, 23), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Restrictive mechanics plus PH physiology; finger SpO2 may read poorly (Raynaud) — use ear/forehead probe.',
    pitfall: 'A low finger SpO2 may be vasospasm, not hypoxaemia; decreased diffusion capacity shortens safe apnoea.',
    sources: [
      { field: 'diffusionFactor', src: 'Co-Existing 8e ch. 24 p. 502: "prolonged periods of preoxygenation to compensate for the decreased pulmonary oxygen reserve and diffusion ca[pacity]"' },
      { field: 'pitfall', src: 'Co-Existing 8e ch. 12 p. 265: "Raynaud phenomenon sometimes appears as part of the constellation of symptoms seen with the scleroderma subtype known as CREST syndrome."' },
    ],
  },
  {
    id: 'chest-wall-restriction', label: 'Kyphoscoliosis / chest-wall restriction', group: 'restrictive',
    complianceMl: b(30, 20, 40), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 8,
    signature: { plateau: b(21, 16, 30), drivingPressure: b(16, 12, 25), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'High plateau from the chest wall, transpulmonary pressure lower than it looks.',
    pitfall: 'Plateau overstates lung stress when the chest wall is stiff; chronic hypoxia leads to PH/cor pulmonale.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 (chronic extrinsic restrictive disease): chest-wall deformities decrease total respiratory compliance (ENG value)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'obesity-ohs', label: 'Obesity (BMI ≥ 40) / OHS', group: 'restrictive',
    complianceMl: b(35, 25, 45), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0.1,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: b(1.3, 1, 2), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 10,
    signature: { plateau: b(19, 14, 26), drivingPressure: b(14, 11, 20), autoPeep: b(0, 0, 2), peakMinusPlateau: b(14, 10, 18) },
    ref: { pbwKg: 66 },
    wired: W_STD, monitor: 'Rapid desaturation at induction (small FRC); SpO2 improves with PEEP 10–15; higher plateau from the chest wall.',
    pitfall: 'Set VT on predicted, not actual, weight; PEEP counters the abdominal load.',
    sources: [
      { field: 'shunt', src: 'Co-Existing 8e ch. 19 p. 388: "patients with obesity have higher oxygen requirements and a decreased FRC, which predisposes them to desaturation during induction"' },
      { field: 'recruitability', src: 'Co-Existing 8e ch. 3 p. 52: "With extreme clinical obesity, FRC may exceed closing volume and approach residual volume." (airway closure → PEEP-responsive)' },
    ],
  },
  {
    id: 'pneumonia-lobar', label: 'Lobar pneumonia (unilateral)', group: 'parenchymal',
    complianceMl: b(42, 32, 52), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.1, 1, 1.4), hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 14,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: W_STD, monitor: 'Shunt-type hypoxaemia that responds poorly to FiO2 and PEEP; mechanics mildly worse.',
    pitfall: 'PEEP may overdistend the healthy lung and divert blood to the consolidated one (shunt ↑).',
    sources: [{ field: 'shunt', src: 'Dellinger 5e ch. 24 (pdf 484): multilobar pneumonia with "moderate oxygen requirement" progressing (case); shunt band ENG from consolidated-lobe fraction' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'atelectasis', label: 'Atelectasis (post-induction)', group: 'parenchymal',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.15), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: b(1, 1, 1.1), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 8, 12) },
    wired: W_STD, monitor: 'SpO2 a few points low on FiO2 1.0; improves with a recruitment manoeuvre and PEEP.',
    pitfall: 'FiO2 1.0 at induction worsens absorption atelectasis.',
    sources: [{ field: 'shunt', src: 'Miller 10e pdf p. 341: "The use of 30% versus 100% O2 during induction was demonstrated in a clinical study to eliminate the formation of atelectasis."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'oedema-cardiogenic', label: 'Cardiogenic pulmonary oedema', group: 'parenchymal',
    complianceMl: b(38, 28, 48), rInsp: b(14, 10, 18), rExp: b(16, 10, 22), autoPeepTendency: 0.1,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(1.5, 1.2, 2.5), hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 7,
    signature: { plateau: b(18, 15, 23), drivingPressure: b(13, 10, 18), autoPeep: b(0, 0, 2), peakMinusPlateau: b(14, 10, 18) },
    wired: W_STD, monitor: 'PEEP improves SpO2 quickly; in the failing LV it may also help CO (afterload) — in this model (until 7a) CO falls with mean Palv.',
    pitfall: 'PEEP lowers LV afterload: the preload-dependent fall in CO seen in normal hearts may not happen (Stage 7a).',
    sources: [{ field: 'recruitability', src: 'Dellinger 5e ch. 27 p. 419 cites Gray, NEJM 2008;359:142 ("Noninvasive ventilation in acute cardiogenic pulmonary edema")' }, { field: 'signature', src: S_MECH }],
    disagreements: 'Positive pressure raises or lowers CO in LV failure depending on filling; the Stage 3 coupling can only lower it.',
  },
  {
    id: 'oedema-noncardiogenic', label: 'Non-cardiogenic oedema (negative-pressure / TRALI)', group: 'parenchymal',
    complianceMl: b(35, 25, 45), rInsp: b(13, 10, 16), rExp: b(13, 10, 16), autoPeepTendency: 0,
    shunt: b(0.25, 0.12, 0.35), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(1.3, 1, 2), hpvSensitivity: 0.8,
    recruitability: 'high', recruitP50: 8,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 11, 20), autoPeep: NO_AP, peakMinusPlateau: b(13, 10, 16) },
    wired: W_STD, monitor: 'Pink frothy secretions, sudden desaturation after airway obstruction or transfusion; PEEP-responsive.',
    pitfall: 'Negative-pressure oedema follows laryngospasm against a closed glottis — it appears after the obstruction is relieved.',
    sources: [{ field: 'group', src: 'Co-Existing 8e ch. 3 p. 39: acute intrinsic restrictive disease (pulmonary edema) causes include "Upper airway obstruction (negative pressur[e])"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'aspiration', label: 'Aspiration pneumonitis', group: 'parenchymal',
    complianceMl: b(38, 28, 48), rInsp: b(16, 12, 25), rExp: b(20, 12, 30), autoPeepTendency: 0.2,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.4, 0.3, 0.5), diffusionFactor: 1, pvrMultiplier: b(1.2, 1, 1.6), hpvSensitivity: 0.8,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(18, 14, 23), drivingPressure: b(13, 10, 18), autoPeep: b(0, 0, 3), peakMinusPlateau: b(16, 12, 25) },
    wired: W_STD, monitor: 'Bronchospasm and desaturation soon after regurgitation; ARDS-like within hours.',
    pitfall: 'Early antibiotics and steroids are not indicated for sterile pneumonitis.',
    sources: [{ field: 'group', src: 'Dellinger 5e ch. 39 (pdf 881): "Aspiration pneumonitis and secondary infectious pneumonia compromise this criterion."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'covid-pneumonitis', label: 'COVID-type pneumonitis', group: 'parenchymal',
    complianceMl: b(40, 25, 55), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.55, 0.45, 0.65), diffusionFactor: 0.8, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 0.4,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(17, 13, 25), drivingPressure: b(12, 9, 20), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: W_STD, monitor: 'Hypoxaemia out of proportion to mechanics early (lost HPV, microthrombi: high dead space).',
    pitfall: 'High PEEP in the compliant early phenotype overdistends without improving SpO2.',
    sources: [{ field: 'hpvSensitivity', src: 'ENG: the "L vs H phenotype" debate; values mid-way' }, { field: 'signature', src: S_MECH }],
    disagreements: 'L phenotype (C ≈ 50, low recruitability) vs H phenotype (C ≈ 30, ARDS-like, recruitable); the row sits between; later literature treats COVID ARDS as ARDS.',
  },
  // --- vascular, pleural, device and special (Task 11) ---
  {
    id: 'pulmonary-hypertension', label: 'Pulmonary hypertension (PH crisis risk)', group: 'vascular',
    complianceMl: b(50, 40, 60), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.38, 0.3, 0.5), diffusionFactor: 0.9, pvrMultiplier: b(3, 2, 6), hpvSensitivity: 1.5,
    recruitability: 'low', recruitP50: 4,
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 7, 13), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Mechanics near normal; the danger is haemodynamic: high PEEP/plateau, hypoxia or hypercapnia → PVR ↑ → RV failure (CVP ↑, BP ↓, SpO2 ↓).',
    pitfall: 'Hypercapnia, acidosis, hypoxia, light anaesthesia and high intrathoracic pressure each raise PVR — permissive hypercapnia is harmful here.',
    sources: [
      { field: 'pvrMultiplier', src: 'Co-Existing 8e ch. 9 p. 197: "pulmonary hypertension as a broad entity is defined as mPAP over 20 mm Hg measured by right heart catheterization." (PVR × 3 = moderate group 1/3 disease, ENG)' },
      { field: 'hpvSensitivity', src: 'ENG: HPV and hypercapnic vasoconstriction on an already-constricted bed; Stage 7a acts on it' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'pe-massive', label: 'Massive pulmonary embolism', group: 'vascular',
    complianceMl: b(50, 40, 60), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.12, 0.05, 0.25), deadSpaceFraction: b(0.6, 0.45, 0.75), diffusionFactor: 1, pvrMultiplier: b(4, 2.5, 6), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 7, 13), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Sudden EtCO2 fall with unchanged ventilation, hypotension, SpO2 fall; airway pressures unchanged.',
    pitfall: 'Normal airway pressures with a falling EtCO2 point to the circulation (PE, low CO), not the lung.',
    sources: [
      { field: 'deadSpaceFraction', src: 'Dellinger 5e ch. 42 (pdf 921): "If the patient has end-tidal CO2 (PETCO2) monitoring, an increase in the PaCO2-PETCO2 gradient may occur."' },
      { field: 'signature', src: S_MECH },
    ],
  },
  {
    id: 'pe-submassive', label: 'Submassive pulmonary embolism', group: 'vascular',
    complianceMl: b(52, 42, 62), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 1, pvrMultiplier: b(2, 1.5, 3), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 7, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Widened Pa–EtCO2 gradient, tachycardia, RV strain; BP preserved.',
    pitfall: 'Normotensive does not mean safe: RV dysfunction predicts deterioration.',
    sources: [{ field: 'deadSpaceFraction', src: 'Dellinger 5e ch. 42 (pdf 921): "an increase in the PaCO2-PETCO2 gradient may occur."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'fat-embolism', label: 'Fat embolism', group: 'vascular',
    complianceMl: b(42, 30, 52), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.2, 0.1, 0.3), deadSpaceFraction: b(0.45, 0.35, 0.55), diffusionFactor: 0.9, pvrMultiplier: b(2, 1.3, 3), hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(17, 14, 22), drivingPressure: b(12, 9, 17), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Hypoxaemia 24–72 h after long-bone fracture/fixation, then an ARDS-like picture; EtCO2 dip at reaming.',
    pitfall: 'The triad (hypoxaemia, neurological change, petechiae) is incomplete under anaesthesia.',
    sources: [{ field: 'group', src: 'Dellinger 5e ch. 26 p. 386 cites "Fat embolism in patients with an isolated fracture of the femoral shaft. J Trauma. 1988;28:383"' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'air-embolism', label: 'Venous air embolism', group: 'vascular',
    complianceMl: b(52, 42, 62), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.15), deadSpaceFraction: b(0.5, 0.35, 0.65), diffusionFactor: 1, pvrMultiplier: b(2.5, 1.5, 4), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(14, 11, 17), drivingPressure: b(9, 7, 12), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Abrupt EtCO2 fall (sitting craniotomy, laparoscopy), then hypotension and arrhythmia.',
    pitfall: 'EtCO2 falls before the blood pressure — the capnograph is the early monitor.',
    sources: [{ field: 'monitor', src: 'Miller 10e pdf p. 505: N2O expands trapped air (VAE management context); EtCO2 as the sensitive monitor is ENG consensus' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pleural-effusion', label: 'Large pleural effusion', group: 'pleural',
    complianceMl: b(40, 30, 50), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.33, 0.28, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(10, 8, 12) },
    wired: W_STD, monitor: 'Compressive atelectasis: modest shunt, compliance falls; improves after drainage.',
    pitfall: 'Re-expansion pulmonary oedema after rapid drainage of a large effusion.',
    sources: [{ field: 'pitfall', src: 'Co-Existing 8e ch. 3 p. 39 lists "Reexpansion of collapsed lung" among causes of acute pulmonary edema' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pneumothorax-simple', label: 'Pneumothorax — simple', group: 'pleural',
    complianceMl: b(38, 28, 48), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(18, 14, 23), drivingPressure: b(13, 10, 18), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Rising peak and plateau, falling SpO2; haemodynamics preserved.',
    pitfall: 'Positive pressure (and N2O) converts a simple pneumothorax into a tension one.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 1823: "whenever positive-pressure ventilation is used, the pressure [in a bulla rises]" (bullae and pneumothorax under PPV)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pneumothorax-tension', label: 'Pneumothorax — tension', group: 'pleural',
    complianceMl: b(18, 10, 25), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.45), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 2.5), hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(32, 25, 50), drivingPressure: b(27, 20, 45), autoPeep: NO_AP, peakMinusPlateau: b(14, 10, 18) },
    wired: { ...W_STD, pvr: 'stage7a' }, monitor: 'Airway pressures climb breath by breath, SpO2 falls, then BP collapses with a high CVP (obstructive shock).',
    pitfall: 'Treated as "hypotension and hypoxaemia" without examining the chest — a framing error; decompress before imaging.',
    sources: [{ field: 'pitfall', src: 'Miller 10e pdf p. 142: "provides supportive care for hypotension and hypoxemia without further evaluation, delaying the diagnosis and treatment of tension pneumothorax."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'haemothorax', label: 'Haemothorax', group: 'pleural',
    complianceMl: b(35, 25, 45), rInsp: b(11, 8, 14), rExp: b(11, 8, 14), autoPeepTendency: 0,
    shunt: b(0.15, 0.08, 0.25), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 10,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 11, 20), autoPeep: NO_AP, peakMinusPlateau: b(11, 8, 14) },
    wired: W_STD, monitor: 'Effusion mechanics plus haemorrhage (BP ↓, HR ↑, PPV ↑).',
    pitfall: 'The circulation, not the lung, usually decides the outcome: it is a haemorrhage.',
    sources: [{ field: 'complianceMl', src: 'ENG: as a large effusion (compressive atelectasis), Co-Existing 8e ch. 3' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'one-lung-ventilation', label: 'One-lung ventilation (lateral, open chest)', group: 'airway-device',
    complianceMl: b(25, 18, 32), rInsp: b(18, 12, 25), rExp: b(18, 12, 25), autoPeepTendency: 0.3,
    shunt: b(0.25, 0.2, 0.35), deadSpaceFraction: b(0.35, 0.28, 0.45), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 6,
    signature: { plateau: b(19, 15, 25), drivingPressure: b(14, 10, 20), autoPeep: b(1, 0, 5), peakMinusPlateau: b(18, 12, 25) },
    ref: { vtMl: 350 }, wired: W_STD, monitor: 'Peak and plateau rise when one lung is isolated; SpO2 nadir ~20–30 min in as HPV builds.',
    pitfall: 'Hypoxaemia on OLV: check the tube position first; volatile agents and vasodilators blunt HPV.',
    sources: [
      { field: 'shunt', src: 'Miller 10e pdf p. 499: "Pulmonary right-to-left shunting can be either physiologic, pathologic, or iatrogenic, such as during one-lung ventilation."' },
      { field: 'autoPeepTendency', src: 'Miller 10e pdf p. 1888: "The interaction between applied PEEP and auto-PEEP during one-lung ventilation."' },
    ],
  },
  {
    id: 'endobronchial', label: 'Endobronchial intubation', group: 'airway-device',
    complianceMl: b(28, 20, 35), rInsp: b(14, 10, 18), rExp: b(14, 10, 18), autoPeepTendency: 0,
    shunt: b(0.3, 0.2, 0.4), deadSpaceFraction: b(0.3, 0.25, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'none',
    signature: { plateau: b(23, 18, 30), drivingPressure: b(18, 13, 25), autoPeep: NO_AP, peakMinusPlateau: b(14, 10, 18) },
    wired: W_STD, monitor: 'Peak and plateau jump, SpO2 falls over minutes, unilateral breath sounds; EtCO2 near normal.',
    pitfall: 'Head flexion or pneumoperitoneum pushes the tube in: recheck depth after positioning.',
    sources: [{ field: 'monitor', src: 'Miller 10e pdf p. 1508: "Flexible bronchoscopy or chest radiography can be used if the clinical picture is unclear." (confirming ETT depth)' }, { field: 'complianceMl', src: 'Stage 3 driver: endobronchial halves compliance (ENG, kept consistent)' }],
  },
  {
    id: 'bronchopleural-fistula', label: 'Bronchopleural fistula', group: 'airway-device',
    complianceMl: b(40, 30, 50), rInsp: b(12, 10, 15), rExp: b(12, 10, 15), autoPeepTendency: 0,
    shunt: b(0.12, 0.06, 0.2), deadSpaceFraction: b(0.45, 0.35, 0.6), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'low', recruitP50: 12,
    signature: { plateau: b(17, 14, 21), drivingPressure: b(12, 9, 16), autoPeep: NO_AP, peakMinusPlateau: b(12, 10, 15) },
    wired: { ...W_STD, mechanics: 'vent' }, monitor: 'VTE < VTI (leak through the chest drain) — the leak is NOT modelled by the single-compartment ventilator yet.',
    pitfall: 'Every extra cmH2O of PEEP/plateau enlarges the leak; lowest pressures that oxygenate.',
    sources: [{ field: 'monitor', src: 'ENG: leak not modelled (single compartment, no leak path); listed so the picker is complete' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'neuromuscular-weakness', label: 'Neuromuscular weakness (MG, GBS)', group: 'neuromuscular',
    complianceMl: b(50, 40, 60), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.07, 0.03, 0.12), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 6,
    signature: { plateau: b(15, 12, 18), drivingPressure: b(10, 8, 13), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Normal mechanics on the ventilator; weak or absent spontaneous effort (low P0.1) — failure is of the pump.',
    pitfall: 'Normal gas exchange on the ventilator says nothing about readiness to breathe alone.',
    sources: [{ field: 'monitor', src: 'Co-Existing 8e ch. 3 p. 52: "Respiratory insufficiency that requires mechanical ventilation occurs in 20% to 25% of patients with Guillain-Barré syndrome."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'diaphragm-paralysis', label: 'Bilateral diaphragmatic paralysis', group: 'neuromuscular',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.1, 0.05, 0.15), deadSpaceFraction: b(0.33, 0.28, 0.4), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    wired: W_STD, monitor: 'Basal atelectasis (supine), PEEP-responsive; hypercapnic when weaned.',
    pitfall: 'Worse supine — the abdomen pushes the flaccid diaphragm up.',
    sources: [{ field: 'monitor', src: 'Co-Existing 8e ch. 3 p. 52: neuromuscular disorders "rarely progress to the point of hypercapnic respiratory failure unless diaphragmatic weakness or paralysis is present."' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'pregnancy', label: 'Pregnancy (3rd trimester)', group: 'special',
    complianceMl: b(45, 35, 55), rInsp: b(10, 8, 12), rExp: b(10, 8, 12), autoPeepTendency: 0,
    shunt: b(0.08, 0.04, 0.12), deadSpaceFraction: b(0.3, 0.25, 0.35), diffusionFactor: 1, pvrMultiplier: PV1, hpvSensitivity: 1,
    recruitability: 'moderate', recruitP50: 7,
    signature: { plateau: b(16, 13, 19), drivingPressure: b(11, 8, 14), autoPeep: NO_AP, peakMinusPlateau: b(10, 7, 13) },
    ref: { pbwKg: 57 }, wired: W_STD, monitor: 'Fast desaturation (FRC −20–25 %, VO2 +20 %); normal PaCO2 is ~30 mmHg.',
    pitfall: 'An EtCO2 of 38 is hypoventilation in late pregnancy; supine aortocaval compression lowers CO.',
    sources: [{ field: 'complianceMl', src: 'Co-Existing 8e ch. 3 p. 54: "Intrinsic lung compliance is unaffected by pregnancy. At term, FRC decreases by another 25% in the supine compared to the sitting position." (chest-wall compliance falls: ENG 45)' }, { field: 'signature', src: S_MECH }],
  },
  {
    id: 'neonatal-rds', label: 'Neonatal RDS (3 kg preterm)', group: 'special',
    complianceMl: b(1.5, 0.8, 2.5), rInsp: b(60, 40, 100), rExp: b(60, 40, 100), autoPeepTendency: 0,
    shunt: b(0.25, 0.15, 0.4), deadSpaceFraction: b(0.35, 0.3, 0.45), diffusionFactor: 1, pvrMultiplier: b(1.5, 1, 3), hpvSensitivity: 1.2,
    recruitability: 'high', recruitP50: 6,
    signature: { plateau: b(15, 11, 25), drivingPressure: b(10, 6, 19), autoPeep: NO_AP, peakMinusPlateau: b(6, 4, 10) },
    ref: { vtMl: 15, rr: 40, peep: 5, pbwKg: 3, flowLpm: 6 }, wired: W_STD,
    monitor: 'Very low compliance (≈ 0.5 mL/cmH2O/kg), PEEP- and surfactant-responsive; high rates with small VT.',
    pitfall: 'Surfactant changes compliance within minutes: pressures that were needed become injurious.',
    sources: [{ field: 'complianceMl', src: 'ENG: surfactant-deficient lung ≈ 0.5 mL/cmH2O/kg (3 kg → 1.5); 3.0 ETT ≈ 60 cmH2O/L/s — neonatal texts not in the local library; flagged for Ali' }, { field: 'signature', src: S_MECH }],
  },
];
