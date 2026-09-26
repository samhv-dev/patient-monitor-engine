// Saadat bedside checklist page (research/06 §7; BUILD-PLAN Stage 8 "Saadat screens as a capture source"). The engine
// runs the saadat-like skin; each item restores the start snapshot, plays its demo and measures what the engine did;
// Ali records the real monitor's behaviour and a verdict; the results JSON feeds `bedside:apply` (skin provenance).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';
import { BEDSIDE, type BedsideItem, type BedsideResult, type BedsideResults, type Verdict } from '../../../../packages/validation/src/bedside/checklist.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'saadat-like',
  engine: { seed: 7, patient: { baseline: { hr: 75, sbp: 120, dbp: 75 }, sensors: { ecg: 'on', spo2: 'on', nibp: 'on', co2: 'on' } } },
});
const STORE = 'pme-bedside-results';
let simT = 0;
pm.on((e) => { if ('t' in e) simT = Math.max(simT, e.t); });
const start = new Promise<Awaited<ReturnType<typeof pm.snapshot>>>((res) => setTimeout(() => res(pm.snapshot()), 1500));
const results = new Map<string, BedsideResult>();
try {
  const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as BedsideResults | null;
  for (const r of saved?.results ?? []) results.set(r.id, r);
} catch { /* no storage: start empty */ }
$<HTMLInputElement>('date').value = new Date().toISOString().slice(0, 10);

let n = 0;
const send = (body: Record<string, unknown>) => pm.dispatch({ id: `bedside-${++n}`, issuedBy: 'bedside', ...body } as Command);

/** Run an item's demo from the start snapshot; resolve with a text of what the engine measured. */
async function runDemo(item: BedsideItem): Promise<string> {
  await pm.restore(await start);
  await new Promise((r) => setTimeout(r, 300));
  const t0 = simT;
  const events: EngineEvent[] = [];
  const off = pm.on((e) => events.push(e));
  let stepT = t0;
  for (const c of item.demo) {
    const { afterS, ...cmd } = c as { afterS?: number } & Record<string, unknown>;
    if (afterS) await new Promise((r) => setTimeout(r, afterS * 1000));
    if (afterS) stepT = simT;
    await send(cmd);
  }
  const deadline = performance.now() + 90_000;
  const found = (): string | null => {
    const m = item.measure;
    if (m.startsWith('alarm:')) {
      const a = events.find((e) => e.type === 'alarm' && e.id === m.slice(6) && e.state === 'raised');
      return a && 't' in a ? `${m.slice(6)} after ${(a.t - t0).toFixed(1)} s` : null;
    }
    if (m === 'nibp') {
      const s = events.find((e) => e.type === 'nibp' && e.phase === 'inflating');
      const d = events.find((e) => e.type === 'nibp' && (e.phase === 'done' || e.phase === 'failed'));
      return s && d && 't' in s && 't' in d ? `cycle ${(d.t - s.t).toFixed(1)} s` : null;
    }
    if (m.startsWith('hr>=')) {
      const v = Number(m.slice(4));
      const h = events.find((e) => e.type === 'measurement' && e.t > stepT && (e.values.hr?.value ?? 0) >= v);
      return h && 't' in h ? `HR ≥ ${v} after ${(h.t - stepT).toFixed(1)} s` : null;
    }
    return 'see screen';
  };
  for (;;) {
    const f = found();
    if (f || performance.now() > deadline) { off(); return f ?? 'not seen within 90 s'; }
    await new Promise((r) => setTimeout(r, 250));
  }
}

function persist(): BedsideResults {
  const r: BedsideResults = {
    schema: 'pme-bedside-results/1', device: $<HTMLInputElement>('device').value, firmware: $<HTMLInputElement>('firmware').value,
    observer: $<HTMLInputElement>('observer').value, date: $<HTMLInputElement>('date').value, skin: 'saadat-like', results: [...results.values()],
  };
  try { localStorage.setItem(STORE, JSON.stringify(r)); } catch { /* not kept */ }
  return r;
}

for (const item of BEDSIDE) {
  const r = results.get(item.id) ?? { id: item.id, verdict: 'not-checked' as Verdict, observed: '', engineMeasured: '', note: '' };
  results.set(item.id, r);
  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.item = item.id;
  el.innerHTML = `<h3></h3><p class="mon"></p><p class="eng"></p><div class="row">
    <button class="run">Run engine demo</button><label>Engine: <input class="measured wide" /></label></div><div class="row">
    <label>Monitor did: <input class="observed wide" /></label>
    <select class="verdict"><option>not-checked</option><option>matches</option><option>close</option><option>wrong</option></select>
    <label>Note <input class="note wide" /></label></div>`;
  (el.querySelector('h3') as HTMLElement).textContent = item.title;
  (el.querySelector('.mon') as HTMLElement).textContent = `At the monitor: ${item.atMonitor}`;
  (el.querySelector('.eng') as HTMLElement).textContent = `Engine: ${item.engine}`;
  const q = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  q<HTMLInputElement>('.measured').value = r.engineMeasured;
  q<HTMLInputElement>('.observed').value = r.observed;
  q<HTMLSelectElement>('.verdict').value = r.verdict;
  q<HTMLInputElement>('.note').value = r.note;
  const sync = () => {
    Object.assign(r, { engineMeasured: q<HTMLInputElement>('.measured').value, observed: q<HTMLInputElement>('.observed').value, verdict: q<HTMLSelectElement>('.verdict').value as Verdict, note: q<HTMLInputElement>('.note').value });
    persist();
  };
  el.addEventListener('input', sync);
  el.addEventListener('change', sync);
  q<HTMLButtonElement>('.run').addEventListener('click', async () => {
    q<HTMLButtonElement>('.run').disabled = true;
    q<HTMLInputElement>('.measured').value = 'running…';
    q<HTMLInputElement>('.measured').value = await runDemo(item);
    q<HTMLButtonElement>('.run').disabled = false;
    sync();
  });
  $('items').append(el);
}
$('sound').addEventListener('click', () => void pm.enableSound());
$('save').addEventListener('click', () => {
  const r = persist();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }));
  a.download = `bedside-${r.date}.json`;
  a.click();
});
(window as unknown as { __pmeBedside: unknown }).__pmeBedside = { pm, results };
