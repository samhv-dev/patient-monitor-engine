// Generated controls (shared by the same-screen panel and the remote). One row per vocabulary entry, so
// Stage 2/5 variables, rhythms, modifiers and devices appear without UI changes.
import type { RhythmId } from '@pme/engine-core';
import type { CommandInput, MeasuredMap, StateEvent } from '../protocol.ts';
import type { Vocabulary } from '../vocabulary.ts';
import {
  deviceCommand,
  flagView,
  modifierCommand,
  pinCommand,
  rampFrom,
  readout,
  releaseCommand,
  rhythmCommand,
  targetCommand,
} from './controls.ts';

export interface ControlsHost {
  /** Send now, or stage when stage-then-commit is on. `key` identifies the control (a restage replaces). */
  submit(c: CommandInput, key: string): void;
}

export interface ControlsView {
  /** Refresh the readouts and flags from the latest state and measurements. */
  update(state: StateEvent | null, measured: MeasuredMap): void;
  readonly el: HTMLElement;
}

/** Maps a StateVar to the NumericId that displays it (displayed column). */
const DISPLAYED: Partial<Record<string, string>> = { hr: 'hr', spo2: 'spo2', etco2: 'etco2', rr: 'rr', tempCore: 'tempCore', sbp: 'abpSys', dbp: 'abpDia', cvp: 'cvpMean' };

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

function select(doc: Document, options: Array<{ value: string; label: string }>, value: string, name: string): HTMLSelectElement {
  const s = el(doc, 'select', { name });
  for (const o of options) s.append(el(doc, 'option', { value: o.value }, o.label));
  s.value = value;
  return s;
}

function numberInput(doc: Document, name: string, min: number, max: number, step: number, value: number): HTMLInputElement {
  return el(doc, 'input', { type: 'number', name, min: String(min), max: String(max), step: String(step), value: String(value) });
}

export function renderControls(parent: HTMLElement, vocab: Vocabulary, host: ControlsHost, opts: { mode?: 'manual' | 'modeled' } = {}): ControlsView {
  const doc = parent.ownerDocument;
  const root = el(doc, 'div', { class: 'pme-controls' });
  const section = (title: string) => {
    const s = el(doc, 'section', { class: 'pme-section' });
    s.append(el(doc, 'h3', {}, title));
    root.append(s);
    return s;
  };
  const row = (s: HTMLElement) => {
    const r = el(doc, 'div', { class: 'pme-row' });
    s.append(r);
    return r;
  };

  // Rhythm
  const rs = section('Rhythm');
  const r1 = row(rs);
  const rhythmSel = select(doc, vocab.rhythms.map((r) => ({ value: r.id, label: r.label })), vocab.rhythms[0]?.id ?? 'sinus', 'rhythm');
  const whenSel = select(doc, [{ value: 'now', label: 'now' }, { value: 'nextBeat', label: 'next beat' }], 'now', 'rhythm-when');
  const rhythmBtn = el(doc, 'button', { type: 'button', 'data-action': 'rhythm' }, 'Apply');
  rhythmBtn.addEventListener('click', () => host.submit(rhythmCommand(rhythmSel.value as RhythmId, whenSel.value as 'now' | 'nextBeat'), 'rhythm'));
  r1.append(rhythmSel, whenSel, rhythmBtn);

  // Targets (one row per variable)
  const ts = section('Targets');
  const readouts: Array<{ id: string; out: HTMLElement; flag: HTMLElement; spec: Vocabulary['variables'][number] }> = [];
  for (const spec of vocab.variables) {
    const r = row(ts);
    r.dataset.var = spec.id;
    const flag = el(doc, 'span', { class: 'pme-flag' });
    const val = numberInput(doc, `${spec.id}-value`, spec.min, spec.max, spec.step, spec.normal);
    const dur = numberInput(doc, `${spec.id}-ramp`, 0, vocab.ramp.maxDurationS, 1, 0);
    const curve = select(doc, vocab.ramp.curves.map((c) => ({ value: c, label: c })), 'linear', `${spec.id}-curve`);
    const set = el(doc, 'button', { type: 'button', 'data-action': 'set' }, 'Set');
    const ramp = () => rampFrom(Number(dur.value), curve.value as 'linear', vocab.ramp.maxDurationS);
    set.addEventListener('click', () => host.submit(targetCommand(spec, Number(val.value), ramp()), `target.${spec.id}`));
    const out = el(doc, 'span', { class: 'pme-readout', title: 'target / truth / displayed' }, '—');
    r.append(flag, el(doc, 'strong', {}, spec.label), val, el(doc, 'span', {}, 'ramp s'), dur, curve, set, out);
    if (spec.pinnable) {
      const pin = el(doc, 'button', { type: 'button', 'data-action': 'pin' }, 'Pin');
      const rel = el(doc, 'button', { type: 'button', 'data-action': 'release' }, 'Release');
      const modeled = opts.mode === 'modeled';
      pin.disabled = rel.disabled = !modeled;
      if (!modeled) pin.title = rel.title = 'Pin and release need MODELED mode (Stage 7)';
      pin.addEventListener('click', () => host.submit(pinCommand(spec, Number(val.value), ramp()), `pin.${spec.id}`));
      rel.addEventListener('click', () => host.submit(releaseCommand(spec, ramp()), `pin.${spec.id}`));
      r.append(pin, rel);
    }
    readouts.push({ id: spec.id, out, flag, spec });
  }

  // Modifiers
  const ms = section('Modifiers');
  for (const spec of vocab.modifiers) {
    const r = row(ms);
    r.dataset.modifier = spec.path;
    if (spec.kind === 'number') {
      const v = numberInput(doc, spec.path, spec.min, spec.max, spec.step, spec.normal);
      const b = el(doc, 'button', { type: 'button', 'data-action': 'modifier' }, 'Set');
      b.addEventListener('click', () => host.submit(modifierCommand(spec, Number(v.value)), `mod.${spec.path}`));
      r.append(el(doc, 'span', {}, spec.label), v, b);
      continue;
    }
    const on = el(doc, 'input', { type: 'checkbox', name: `${spec.path}-on` });
    const inputs = spec.fields.map((f) =>
      f.type === 'enum' ? select(doc, f.options, f.normal, `${spec.path}.${f.key}`) : numberInput(doc, `${spec.path}.${f.key}`, f.min, f.max, f.step, f.normal),
    );
    const apply = () => {
      const value: Record<string, string | number> = {};
      spec.fields.forEach((f, i) => {
        const inp = inputs[i] as HTMLInputElement | HTMLSelectElement;
        value[f.key] = f.type === 'number' ? Number(inp.value) : inp.value;
      });
      host.submit(modifierCommand(spec, on.checked ? value : null), `mod.${spec.path}`);
    };
    on.addEventListener('change', apply);
    for (const i of inputs) i.addEventListener('change', () => on.checked && apply());
    const label = el(doc, 'label');
    label.append(on, doc.createTextNode(spec.label));
    r.append(label, ...inputs);
  }

  // Devices
  const ds = section('Device');
  for (const spec of vocab.devices) {
    const lanes = spec.lanes ?? 0;
    const r = row(ds);
    r.dataset.device = spec.id;
    r.append(el(doc, 'span', {}, spec.label));
    for (let lane = 0; lane < Math.max(1, lanes); lane++) {
      const normal = Array.isArray(spec.normal) ? (spec.normal[lane] ?? spec.options[0]?.value ?? '') : spec.normal;
      const s = select(doc, spec.options, normal, lanes ? `${spec.id}.${lane}` : spec.id);
      s.addEventListener('change', () => host.submit(deviceCommand(spec, s.value, lanes ? lane : undefined), lanes ? `${spec.id}.${lane}` : spec.id));
      r.append(s);
    }
  }

  parent.append(root);
  return {
    el: root,
    update(state, measured) {
      for (const r of readouts) {
        const id = DISPLAYED[r.id];
        const m = id ? measured[id as keyof MeasuredMap] : undefined;
        r.out.textContent = readout(r.spec, state, m?.value);
        const f = flagView(state?.control[r.spec.id]);
        r.flag.className = f.className;
        r.flag.textContent = f.text;
        r.flag.title = f.title;
      }
    },
  };
}
