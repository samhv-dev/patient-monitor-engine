// Stage 2 demo (BUILD-PLAN Stage 2 "Demo"): ECG II + V5, ABP, pleth and CVP lanes; HR, ABP, CVP, PR, PI and
// NIBP tiles; instructor controls for targets with ramps, rhythm, line damping, flush/zero, NIBP and sensors.
import { RHYTHM_IDS, type Command, type RhythmId, type RhythmOpts } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const RHYTHM_MENU: Array<[string, RhythmId, RhythmOpts?]> = [
  ['Sinus', 'sinus'],
  ['Sinus bradycardia', 'sinusBrady'],
  ['Sinus tachycardia', 'sinusTachy'],
  ['Atrial fibrillation', 'afib'],
  ['Atrial flutter 2:1', 'aflutter', { ratio: 2 }],
  ['Atrial flutter 4:1', 'aflutter', { ratio: 4 }],
  ['SVT (AVNRT)', 'svtAvnrt'],
  ['1st-degree AV block', 'avb1'],
  ['2nd-degree Mobitz I', 'avb2Mobitz1'],
  ['3rd-degree, narrow escape', 'avb3Narrow'],
  ['3rd-degree, wide escape', 'avb3Wide'],
  ['Monomorphic VT 170', 'vtMono'],
  ['Monomorphic VT 220 (pulseless)', 'vtMono', { rateBpm: 220 }],
  ['Asystole', 'asystole'],
];

/** A Command without id/issuedBy (distributes over the union so each variant keeps its fields). */
type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 7, patient: { sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', nibp: 'on' } } },
  lanes: ['ecgII', 'V5'],
  waves: ['abp', 'pleth', 'cvp'],
  nibp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage2', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });

// Rhythm and HR
const rhythmSel = $<HTMLSelectElement>('rhythm');
RHYTHM_MENU.forEach(([label], i) => rhythmSel.add(new Option(label, String(i))));
rhythmSel.addEventListener('change', () => {
  const [, rhythm, opts] = RHYTHM_MENU[Number(rhythmSel.value)]!;
  void send({ type: 'setRhythm', rhythm, ...(opts ? { opts } : {}), when: 'now' });
});
const hr = $<HTMLInputElement>('hr');
hr.addEventListener('input', () => ($('hrVal').textContent = hr.value));
hr.addEventListener('change', () => void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value), ...ramp() }));

const toggle = (id: string, on: (pressed: boolean) => void) => {
  const b = $<HTMLButtonElement>(id);
  b.addEventListener('click', () => {
    const pressed = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(pressed));
    on(pressed);
  });
  return b;
};
toggle('pvc', (p) => void send({ type: 'setModifiers', modifiers: { pvc: p ? { pattern: 'bigeminy', probability: 0 } : null } }));

// Targets (MANUAL setTarget with ramps; one stageGroup so SBP/DBP/CVP move together)
function ramp(): { ramp?: { durationS: number; curve: 'linear' } } {
  const durationS = Number($<HTMLSelectElement>('ramp').value);
  return durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {};
}
$('apply').addEventListener('click', () => {
  const g = `targets-${n}`;
  void send({ type: 'setTarget', variable: 'sbp', value: Number($<HTMLInputElement>('sbp').value), ...ramp(), stageGroup: g });
  void send({ type: 'setTarget', variable: 'dbp', value: Number($<HTMLInputElement>('dbp').value), ...ramp(), stageGroup: g });
  void send({ type: 'setTarget', variable: 'cvp', value: Number($<HTMLInputElement>('cvp').value), ...ramp(), stageGroup: g });
});
$('vol').addEventListener('change', () => void send({ type: 'setTarget', variable: 'volumeStatus', value: Number($<HTMLInputElement>('vol').value), ...ramp() }));

// Arterial line
const DAMP = { normal: { value: 0.45, fnHz: 20 }, under: { value: 0.2, fnHz: 12 }, over: { value: 1.2, fnHz: 20 } } as const;
$('damp').addEventListener('change', () => {
  const d = DAMP[$<HTMLSelectElement>('damp').value as keyof typeof DAMP];
  void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'damp', ...d } });
});
$('flush').addEventListener('click', () => void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }));
$('zero').addEventListener('click', () => void send({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'zero' } }));

// NIBP
$('nibpStart').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'start' } }));
$('nibpAuto').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } }));
$('nibpStat').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'stat' } }));
$('nibpStop').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'stop' } }));
$('cuffSite').addEventListener('change', () => {
  const site = $<HTMLSelectElement>('cuffSite').value;
  // the SpO2 probe sits on the left finger, the A-line in the left radial: a left-arm cuff occludes both
  void send({ type: 'attachSensor', sensor: 'nibp', state: 'on', site });
});

// Sensors
toggle('sAbp', (p) => void send({ type: 'attachSensor', sensor: 'abp', state: p ? 'connected' : 'none' }));
toggle('sCvp', (p) => void send({ type: 'attachSensor', sensor: 'cvp', state: p ? 'connected' : 'none' }));
toggle('sSpo2', (p) => void send({ type: 'attachSensor', sensor: 'spo2', state: p ? 'on' : 'off' }));
toggle('sNibp', (p) => void send({ type: 'attachSensor', sensor: 'nibp', state: p ? 'on' : 'off' }));

// Arrest: VF when the rhythm library has it (Stage 5), else pulseless VT 220
$('vf').addEventListener('click', () => {
  const vf = (RHYTHM_IDS as readonly string[]).includes('vfCoarse');
  void send(vf ? ({ type: 'setRhythm', rhythm: 'vfCoarse' as RhythmId, when: 'now' } as CommandBody) : { type: 'setRhythm', rhythm: 'vtMono', opts: { rateBpm: 220 }, when: 'now' });
});
toggle('cpr', (p) => void send({ type: 'applyEvent', event: { kind: 'cpr', active: p, rate: 110, quality: 1 } }));

const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => {
  void pm.enableSound().then(() => {
    soundBtn.textContent = 'Sound on';
    soundBtn.disabled = true;
  });
});

// Diagnostics: render path, L1 truth vs displayed ABP, NIBP phase
let path = '…';
void pm.renderPath.then((p) => (path = p));
let truth = '';
let shown = '';
let nibp = '';
pm.on((e) => {
  if (e.type === 'state') truth = `truth ${e.values.sbp?.toFixed(0)}/${e.values.dbp?.toFixed(0)} cvp ${e.values.cvp?.toFixed(1)} svr ${e.values.svr?.toFixed(2)} flags ${JSON.stringify(e.control)}`;
  if (e.type === 'measurement' && e.values.abpSys?.value != null) shown = `shown ${e.values.abpSys.value.toFixed(0)}/${e.values.abpDia?.value?.toFixed(0)} (${e.values.abpMean?.value?.toFixed(0)})`;
  if (e.type === 'nibp') nibp = `nibp ${e.phase}${e.cuffMmHg !== undefined ? ` cuff ${e.cuffMmHg}` : ''}${e.result ? ` → ${e.result.sys}/${e.result.dia} (${e.result.map})` : ''}`;
});
setInterval(() => ($('diag').textContent = `render path: ${path}\n${truth}\n${shown}\n${nibp}`), 1000);
