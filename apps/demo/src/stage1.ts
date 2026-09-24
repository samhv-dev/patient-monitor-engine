import type { Command, RhythmId, RhythmOpts } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

const RHYTHM_MENU: Array<[string, RhythmId, RhythmOpts?]> = [
  ['Sinus', 'sinus'],
  ['Sinus bradycardia', 'sinusBrady'],
  ['Sinus tachycardia', 'sinusTachy'],
  ['Atrial fibrillation', 'afib'],
  ['Atrial flutter 2:1', 'aflutter', { ratio: 2 }],
  ['Atrial flutter 4:1', 'aflutter', { ratio: 4 }],
  ['Atrial flutter variable', 'aflutter', { ratio: 'variable' }],
  ['SVT (AVNRT)', 'svtAvnrt'],
  ['1st-degree AV block', 'avb1'],
  ['2nd-degree Mobitz I', 'avb2Mobitz1'],
  ['3rd-degree, narrow escape', 'avb3Narrow'],
  ['3rd-degree, wide escape', 'avb3Wide'],
  ['Monomorphic VT', 'vtMono'],
  ['Asystole', 'asystole'],
];

/** A Command without id/issuedBy (distributes over the union so each variant keeps its fields). */
type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), { skin: 'philips-like', engine: { seed: 7 }, lanes: ['ecgII', 'V5'] });
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage1', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });

const rhythmSel = $<HTMLSelectElement>('rhythm');
RHYTHM_MENU.forEach(([label], i) => rhythmSel.add(new Option(label, String(i))));
rhythmSel.addEventListener('change', () => {
  const [, rhythm, opts] = RHYTHM_MENU[Number(rhythmSel.value)]!;
  void send({ type: 'setRhythm', rhythm, ...(opts ? { opts } : {}), when: 'now' });
});

const hr = $<HTMLInputElement>('hr');
const hrVal = $('hrVal');
const ramp = $<HTMLSelectElement>('ramp');
hr.addEventListener('input', () => (hrVal.textContent = hr.value));
hr.addEventListener('change', () => {
  const durationS = Number(ramp.value);
  void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value), ...(durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {}) });
});

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
const filterBtn = toggle('filter', (p) => {
  filterBtn.textContent = `Filter: ${p ? 'Diagnostic' : 'Monitor'}`;
  void send({ type: 'device', action: { device: 'ecg', action: 'filter', value: p ? 'diagnostic' : 'monitor' } });
});
toggle('fps30', (p) => pm.setFps(p ? 30 : 60));
const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => {
  void pm.enableSound().then(() => {
    soundBtn.textContent = 'Sound on';
    soundBtn.disabled = true;
  });
});

// Diagnostics for the Gate 1 checklist: render path, beep − R, memory.
const beats: number[] = [];
let simT = 0;
pm.on((e) => {
  if (e.type === 'beat') {
    beats.push(e.t);
    if (beats.length > 200) beats.shift();
    simT = e.t;
  }
});
let path = '…';
void pm.renderPath.then((p) => (path = p));
setInterval(() => {
  const played = pm.audioLog.filter((l) => !l.dropped).slice(-20);
  const diffs = played
    .map((l) => l.simT - beats.reduce((b, x) => (Math.abs(x - l.simT) < Math.abs(b - l.simT) ? x : b), -1e9))
    .map((d) => d * 1000);
  const dropped = pm.audioLog.filter((l) => l.dropped).length;
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  $('diag').textContent =
    `render path: ${path}   last beat t=${simT.toFixed(2)} s\n` +
    (diffs.length
      ? `beep − R over last ${diffs.length}: min ${Math.min(...diffs).toFixed(0)} ms, mean ${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(0)} ms, max ${Math.max(...diffs).toFixed(0)} ms; dropped tones ${dropped}\n`
      : 'beep − R: enable sound to measure\n') +
    (mem ? `JS heap: ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'JS heap: (not exposed by this browser)');
}, 1000);
