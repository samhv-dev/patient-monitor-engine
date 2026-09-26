// Defaults, patient presets, asynchrony scenarios and the Hamilton-style mode names of v1.9, as data.
import type { VentConfig, VentMode } from './types.ts';

export const DEFAULT_CONFIG: VentConfig = {
  mode: 'VC', peep: 5, rate: 14, itime: 1.0, fio2: 40, riseTime: 0.15, trigType: 'flow', flowTrig: 2.0, presTrig: -2.0,
  vt: 500, vcFlow: 60, flowPattern: 'square', pause: 0.3, pc: 15, prvcTarget: 450, ps: 12, cycleOff: 25, pmax: 35, pavAssist: 60,
  sex: '', height: 170, compliance: 50, resistance: 10, spont: false, spontRate: 16, pmus: 6, responsiveness: 80,
  pmusRise: 0.30, pmusHold: 0.05, pmusDecay: 0.40, riseShape: 'smoothstep', decayShape: 'halfcos', pmusOffset: 0.0,
  airwayClosure: false, openPressure: 0, recruitedVol: 0, stressIdx: false, stressB: 1.0, uip: false, uipThresh: 28,
  reverseTrig: false, entrainRatio: '1:1', efl: false, eflSeverity: 'moderate', pcrit: 6, eflK: 0.35, peepStent: 40,
  cardiac: false, hr: 75, variability: false, varPct: 8, showPmus: false, showP01: false, sweepSec: 12,
  modeLabel: null,
  sigh: false, trc: false, trcPct: 100, apneaTime: 20, backup: true, backupRate: 12,
  almMVlo: 3.0, almMVhi: 12.0, almFlo: 5, almFhi: 40, almVTlo: 200, almVThi: 800,
};

export type PresetId = 'ardsMild' | 'ardsMod' | 'ardsSev' | 'copd' | 'asthma';
export const PRESETS: Record<PresetId, { label: string; cls: string } & Partial<VentConfig>> = {
  ardsMild: { label: 'ARDS Mild', cls: 'pill-ylw', compliance: 45, resistance: 12, airwayClosure: true, openPressure: 10, recruitedVol: 120 },
  ardsMod: { label: 'ARDS Mod', cls: 'pill-ylw', compliance: 33, resistance: 13, airwayClosure: true, openPressure: 14, recruitedVol: 180, uip: true, uipThresh: 27 },
  ardsSev: { label: 'ARDS Severe', cls: 'pill-org', compliance: 22, resistance: 15, airwayClosure: true, openPressure: 18, recruitedVol: 220, uip: true, uipThresh: 25 },
  copd: { label: 'COPD', cls: 'pill-red', compliance: 60, resistance: 22, efl: true, eflSeverity: 'moderate', pcrit: 7 },
  asthma: { label: 'Asthma', cls: 'pill-blu', compliance: 50, resistance: 35, efl: true, eflSeverity: 'severe', pcrit: 9 },
};
export const PRESET_KEYS = ['compliance', 'resistance', 'airwayClosure', 'openPressure', 'recruitedVol', 'efl', 'eflSeverity', 'pcrit', 'uip', 'uipThresh'] as const;

/** Hamilton-style mode groups → the engine mode that drives them (v1.9 `HMODES`). */
export const HAMILTON_MODES: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, VentMode]>]> = [
  ['Volume controlled (adaptive)', [['(S)CMV+', 'VC'], ['APVcmv', 'PRVC'], ['APVsimv', 'PRVC']]],
  ['Pressure controlled (biphasic)', [['PCV+', 'PC'], ['PSIMV+', 'PSV'], ['SPONT', 'PSV'], ['DuoPAP', 'PC'], ['APRV', 'PC']]],
  ['Intelligent Ventilation', [['ASV', 'PAV']]],
  ['Noninvasive', [['NIV', 'PSV'], ['NIV-ST', 'PSV']]],
];
export const MODE_MAP: Record<string, VentMode> = Object.fromEntries(HAMILTON_MODES.flatMap(([, l]) => l.map(([nm, m]) => [nm, m])));
const DEFAULT_NAME: Record<VentMode, string> = { VC: '(S)CMV+', PC: 'PCV+', PRVC: 'APVcmv', PSV: 'PSIMV+', PAV: 'ASV' };
export const modeName = (c: VentConfig): string => c.modeLabel ?? DEFAULT_NAME[c.mode];
