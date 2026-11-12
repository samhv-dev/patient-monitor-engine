// The simulator's own tools (plan vent-skin-edp-ts.md §4.3): the patient drawer (presets, the lung, the patient's
// effort) and the asynchrony examples. They are the instructor's tools, not the device's, the same under every face.
// V0 lifts them out of the Hamilton front end unchanged, on the drawer markup vent-hamilton.html already has; the
// "Simulator" handle outside the device's bezel comes with the second face (V1).
import { PRESETS, SCENARIOS, type PresetId } from '@pme/ventilator';
import type { Cockpit } from './core/cockpit.ts';
import type { BoolKey, NumKey } from './core/types.ts';
import { $, el } from './dom.ts';

export interface SimTools {
  open(): void;
  close(): void;
  stop(): void;
  /** A face's own section at the end of the drawer (the EDP-TS face's "Show what is not simulated yet", brief 159):
   *  rendered each time the drawer is built; the returned function removes it. */
  addSection?(render: () => HTMLElement): () => void;
}

export function mountSimTools(c: Cockpit): SimTools {
  const sections = new Set<() => HTMLElement>();
  const S = c.cfg;
  const num = S as unknown as Record<NumKey, number>;
  const bool = S as unknown as Record<BoolKey, boolean>;
  function dSld(key: NumKey, label: string, min: number, max: number, step: number, unit: string, fmt?: (v: number) => string, status?: () => string) {
    const f = el('div', { class: 'dfld' });
    const lab = el('div', { class: 'lab' });
    const txt = () => `${label}: ${fmt ? fmt(num[key]) : num[key]}${unit ? ' ' + unit : ''}`;
    lab.append(el('span', {}, txt()));
    const inp = el('input', { type: 'range', min, max, step, value: num[key] }) as HTMLInputElement;
    const st = status ? el('div', { class: 'status' }, status()) : null;
    inp.oninput = () => { c.write({ [key]: parseFloat(inp.value) }, 'tool'); (lab.firstChild as HTMLElement).textContent = txt(); if (st && status) st.textContent = status(); };
    f.append(lab, inp);
    if (st) f.append(st);
    return f;
  }
  function dTog(key: BoolKey, label: string) {
    const en = el('label', { class: 'en' });
    const cb = el('input', { type: 'checkbox' }) as HTMLInputElement;
    cb.checked = bool[key];
    cb.onchange = () => { c.write({ [key]: cb.checked }, 'tool'); buildDrawer(); };
    en.append(cb, 'Enable');
    return el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, label), en));
  }
  function buildDrawer() {
    const dc = $('dcols');
    dc.innerHTML = '';
    const L = el('div'), R = el('div');
    L.append(el('h3', {}, 'Patient Characteristics'));
    const pr = el('div', { class: 'presets' });
    (Object.entries(PRESETS) as Array<[PresetId, (typeof PRESETS)[PresetId]]>).forEach(([id, p]) => {
      const b = el('button', { class: p.cls }, p.label);
      b.onclick = () => c.preset(id);
      pr.append(b);
    });
    L.append(el('div', { style: 'font-size:12px;color:var(--numlab);margin-bottom:6px' }, 'Presets'), pr);
    // Stage V.1: linked, the monitor's lungState IS the lung (absolute) — a slider edit would last only until the next one
    const linked = c.lungLinked();
    const lungSld = (f: HTMLElement) => { if (linked) { const i = f.querySelector('input') as HTMLInputElement; i.disabled = true; i.title = 'Linked: the patient monitor’s lung (lungState)'; } return f; };
    L.append(lungSld(dSld('compliance', 'Compliance', 10, 90, 1, 'ml/cmH₂O', undefined, () => (S.compliance >= 40 ? 'Normal' : S.compliance >= 25 ? 'Reduced' : 'Severely reduced'))));
    L.append(lungSld(dSld('resistance', 'Resistance', 5, 50, 1, 'cmH₂O/l/s', undefined, () => (S.resistance <= 15 ? 'Normal' : S.resistance <= 25 ? 'Elevated' : 'High'))));
    const tau = (S.resistance * S.compliance) / 1000;
    L.append(el('div', { class: 'dfld' }, el('div', { class: 'lab' }, el('span', {}, `Time Constant τ: ${tau.toFixed(2)} s`)), el('div', { class: 'status', style: 'color:var(--numlab)' }, `95% equilibration ${(3 * tau).toFixed(2)} s`)));
    L.append(el('div', { class: 'hr' }), dTog('airwayClosure', 'Airway Closure'));
    if (S.airwayClosure) L.append(dSld('recruitedVol', 'Recruited Volume', 0, 400, 10, 'ml'), dSld('openPressure', 'Opening Pressure', 0, 25, 1, 'cmH₂O'));
    L.append(el('div', { class: 'hr' }), dTog('stressIdx', 'Stress Index'));
    if (S.stressIdx) L.append(dSld('stressB', 'Stress Index', 0.7, 1.4, 0.01, '', (v) => v.toFixed(2), () => (S.stressB < 0.9 ? 'SI<0.9 concave' : S.stressB > 1.1 ? 'SI>1.1 convex' : 'SI 0.9–1.1 normal')));
    L.append(el('div', { class: 'hr' }), dTog('reverseTrig', 'Reverse Triggering'), dTog('spont', 'Spontaneous Breathing'));
    if (S.spont) L.append(dSld('spontRate', 'Spont. Rate', 6, 40, 1, '/min'), dSld('pmus', 'Peak Effort (Pmus)', 0, 20, 0.5, 'cmH₂O', (v) => v.toFixed(1)), dSld('responsiveness', 'Responsiveness', 0, 100, 5, '%'));
    // Stage V.1: lungState also sets efl/eflK/peepStent (lungMechanics) — disabled while linked, as C and R are
    R.append(el('h3', {}, 'Advanced'), lungSld(dTog('efl', 'Expiratory Flow Limitation')));
    if (S.efl) R.append(dSld('pcrit', 'Critical Closing P', 2, 15, 1, 'cmH₂O'), lungSld(dSld('peepStent', 'PEEP Stenting', 0, 100, 5, '%')));
    R.append(dTog('cardiac', 'Cardiac Oscillations'));
    if (S.cardiac) R.append(dSld('hr', 'Heart Rate', 40, 140, 1, 'bpm'));
    R.append(dTog('variability', 'Natural Variability'));
    if (S.variability) R.append(dSld('varPct', 'Variability', 5, 20, 1, '%'));
    R.append(dTog('uip', 'Upper Inflection'));
    if (S.uip) R.append(dSld('uipThresh', 'UIP Threshold', 20, 40, 1, 'cmH₂O'));
    R.append(el('div', { class: 'hr' }), dTog('showP01', 'Show P0.1'));
    for (const s of sections) R.append(el('div', { class: 'hr' }), s());
    dc.append(L, R);
  }
  function buildAsync() {
    const w = $('asyncBtns');
    w.innerHTML = '';
    Object.entries(SCENARIOS).forEach(([id, s]) => {
      const b = el('button', {}, s.name);
      b.onclick = () => c.scenario(id);
      w.append(b);
    });
  }
  const open = () => { buildDrawer(); $('drawer').classList.add('on'); $('scrim').classList.add('on'); };
  const close = () => { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); };
  $('closeDrawer').onclick = close;
  const off = c.onChange((ch) => {
    if (ch.source === 'remote' || ch.source === 'mode' || ch.source === 'preset' || ch.source === 'scenario') buildDrawer();
    if (ch.source === 'scenario') close();
  });
  buildDrawer();
  buildAsync();
  return { open, close, stop: off, addSection: (r) => (sections.add(r), () => void sections.delete(r)) };
}
