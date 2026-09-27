// The Saadat Alborz B9 bedside checklist (research/06 §7 "Photo checklist", "Audio", "Behaviour stopwatch") as data:
// each item says what to do at the real monitor, how the engine page demonstrates the same behaviour on the
// `saadat-like` skin, what the engine measures, and which skin field a delta would change (skin provenance).
// Shared by the checklist page (apps/demo) and `bedside:apply` so both speak the same item ids.
export interface BedsideItem {
  id: string;
  title: string;
  atMonitor: string;
  engine: string;
  /** Commands the page dispatches for the demonstration (JSON-safe; id/issuedBy added by the page). */
  demo: Array<Record<string, unknown>>;
  /** What the page measures from engine events: 'alarm:<ID>' (s from the demo start to raised), 'nibp' (cycle s),
   *  'hr>=<v>' (s until the displayed HR reaches v), or 'visual' (nothing measurable: compare by eye/ear). */
  measure: string;
  /** Skin fields (packages/skins/src/data/skins/saadat-like.json) whose provenance a delta updates. */
  skinFields: string[];
}

export const BEDSIDE: BedsideItem[] = [
  { id: 'main-screen', title: 'Factory main screen (P1)', atMonitor: 'Setup → LOAD DEFAULT, photograph P1 straight on.', engine: 'The saadat-like P1 layout with the default lanes and tiles.', demo: [], measure: 'visual', skinFields: ['layout', 'colors', 'tiles'] },
  { id: 'sweep-erase', title: 'Sweep and erase bar', atMonitor: '240 fps slow-motion clip (≈ 3 s) of the ECG lane.', engine: 'Erase-gap width and cursor line of the sweep.', demo: [], measure: 'visual', skinFields: ['render.eraseGapPx', 'render.cursorLine'] },
  { id: 'alarm-l1', title: 'Level-1 alarm (asystole): sound, lamp, message', atMonitor: 'Asystole on the simulator; record 40 s of audio at 30 cm; film lamp and message bar.', engine: 'Asystole → ASYSTOLE level 1 after the skin delay; burst pattern and lamp flash.', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }], measure: 'alarm:ASYSTOLE', skinFields: ['arrhythmia.asystoleS', 'alarmAudio.level1', 'lamp.level1'] },
  { id: 'alarm-l2', title: 'Level-2 alarm (HR high): sound, lamp, message', atMonitor: 'Set the HR high limit below the HR, alarm level 2.', engine: 'HR limit 60–100 enabled, HR 130 → HR_HIGH.', demo: [{ type: 'device', action: { device: 'alarm', action: 'setLimit', param: 'HR', low: 50, high: 100 } }, { type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR' } }, { type: 'setTarget', variable: 'hr', value: 130, ramp: { durationS: 5 } }], measure: 'alarm:HR_HIGH', skinFields: ['alarmAudio.level2', 'lamp.level2', 'alarmDelays.HR'] },
  { id: 'alarm-l3', title: 'Level-3 technical alarm (SpO2 probe off)', atMonitor: 'Unplug the SpO2 probe.', engine: 'SpO2 sensor off → technical alarm, level 3.', demo: [{ type: 'attachSensor', sensor: 'spo2', state: 'off' }], measure: 'visual', skinFields: ['alarmAudio.level3', 'lamp.level3', 'technical.spo2Off'] },
  { id: 'silence', title: 'Silence: countdown and flashing numeric', atMonitor: 'Raise the L1 alarm, press Silence; film the header icon and the numeric.', engine: 'Asystole, then Silence → 120 s visual countdown (G4b).', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }, { type: 'device', action: { device: 'alarm', action: 'silence' }, afterS: 12 }], measure: 'visual', skinFields: ['silence.durationS', 'silence.countdownIcon'] },
  { id: 'nibp-cycle', title: 'NIBP cycle duration', atMonitor: 'Stopwatch one adult NIBP measurement (press to result) at HR ≈ 75.', engine: 'NIBP start → done.', demo: [{ type: 'device', action: { device: 'nibp', action: 'start' } }], measure: 'nibp', skinFields: ['nibp.inflateMmHg', 'nibp.stepMmHg'] },
  { id: 'hr-step', title: 'HR averaging: 80 → 120', atMonitor: 'Simulator HR 80 → 120; stopwatch until the display reads 120 (8 s average).', engine: 'HR target 80 → 120 in one step; displayed HR reaches 118.', demo: [{ type: 'setTarget', variable: 'hr', value: 80 }, { type: 'setTarget', variable: 'hr', value: 120, afterS: 20 }], measure: 'hr>=118', skinFields: ['hr.averaging'] },
  { id: 'asystole-delay', title: 'Asystole delay: 5 s or 10 s?', atMonitor: 'Lead-off-with-asystole on the simulator; stopwatch to the alarm.', engine: 'Asystole → ASYSTOLE (skin asystoleS).', demo: [{ type: 'setRhythm', rhythm: 'asystole', when: 'now' }], measure: 'alarm:ASYSTOLE', skinFields: ['arrhythmia.asystoleS'] },
  { id: 'qrs-pitch', title: 'QRS beep pitch with SpO2 falling', atMonitor: 'Record the QRS beep at volume 3 while SpO2 falls.', engine: 'SpO2 98 → 85 over 30 s; the QRS tone follows the displayed SpO2.', demo: [{ type: 'setTarget', variable: 'spo2', value: 85, ramp: { durationS: 30 } }], measure: 'visual', skinFields: ['audio.qrsPitch'] },
];

export type Verdict = 'matches' | 'close' | 'wrong' | 'not-checked';
export interface BedsideResult { id: string; verdict: Verdict; observed: string; engineMeasured: string; note: string }
export interface BedsideResults { schema: 'pme-bedside-results/1'; device: string; firmware: string; observer: string; date: string; skin: 'saadat-like'; results: BedsideResult[] }
