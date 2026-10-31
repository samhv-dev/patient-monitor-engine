// E130: the IBP1 (arterial) and IBP2 (venous) lane scales, per channel: Fixed (the skin's own), a Range the instructor
// types within 0–200 mmHg, or Auto (judged every 30 s of sim time from discrete ranges, renderer ibp-scale.ts). The
// scale is the monitor's presentation, held by the instructor's screen and carried to the learner monitors with the
// style, so a Remote shows the control disabled and says where it is set.
import { IBP_AUTO_EVERY_S, IBP_AUTO_RANGES, IBP_SCALE_LIMITS, ibpScaleError, type IbpChannel, type IbpScale, type IbpScales } from '@pme/renderer';
import { button, h, seg, setText, toast } from '../ui.ts';

/** What the control needs from the instructor's session (AppSession). */
export interface IbpScaleHost {
  readonly ibpScales: IbpScales;
  setIbpScales(s: IbpScales): void;
  /** The skin's fixed range of the channel, or null when the monitor draws no such lane. */
  ibpFixedRange(ch: IbpChannel): [number, number] | null;
}

const CHANNELS: ReadonlyArray<[IbpChannel, string]> = [['IBP1', 'IBP1 (arterial)'], ['IBP2', 'IBP2 (venous)']];
const num = (v: number) => (v < 0 ? `−${-v}` : String(v));
const span = (r: readonly [number, number]) => `${num(r[0])}–${num(r[1])}`;

/** The mode and the numbers in words. */
export function describeIbpScale(ch: IbpChannel, s: IbpScale, fixed: [number, number] | null, onHost = true): string {
  if (s.mode === 'custom') return `Range ${span([s.lower, s.upper])} mmHg`;
  if (s.mode === 'auto') return `Auto: judged every ${IBP_AUTO_EVERY_S} s from ${IBP_AUTO_RANGES[ch].map(span).join(', ')} mmHg`;
  if (fixed) return `Fixed ${span(fixed)} mmHg (the monitor's own scale)`;
  return onHost ? `Fixed (the monitor's own scale; no ${ch} lane on this monitor)` : "Fixed (the monitor's own scale)";
}

/** The control; `refresh` repaints it from the host (the tab's own repaint calls it: a change made in the other view). */
export function ibpScalesControl(host: IbpScaleHost | null): { el: HTMLElement; refresh(): void } {
  const [min, max] = IBP_SCALE_LIMITS;
  const rows = CHANNELS.map(([ch, name]) => {
    const cur = (): IbpScale => host?.ibpScales?.[ch] ?? { mode: 'fixed' };
    const field = (which: 'lower' | 'upper', label: string) => {
      const inp = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min, max, step: 1, name: `${ch.toLowerCase()}-${which}`, 'aria-label': `${ch} ${label} (mmHg)` });
      return { inp, el: h('label', { class: 'field' }, `${label} (mmHg)`, inp) };
    };
    const lower = field('lower', 'Lower');
    const upper = field('upper', 'Upper');
    const now = h('p', { class: 'hint', role: 'status', 'data-ibp-now': '' });
    const put = (s: IbpScale) => {
      if (!host) return;
      const next: IbpScales = { ...host.ibpScales };
      if (s.mode === 'fixed') delete next[ch];
      else next[ch] = s;
      host.setIbpScales(next);
    };
    const invalid = (on: boolean) => {
      for (const f of [lower, upper]) if (on) f.inp.setAttribute('aria-invalid', 'true');
      else f.inp.removeAttribute('aria-invalid');
    };
    /** A typed range starts from the current one: the typed range, else the fixed one inside 0–200. */
    const startRange = (): [number, number] => {
      const c = cur();
      if (c.mode === 'custom') return [c.lower, c.upper];
      const f = host?.ibpFixedRange?.(ch) ?? [min, max];
      const r: [number, number] = [Math.max(min, f[0]), Math.min(max, f[1])];
      return r[0] < r[1] ? r : [min, max];
    };
    const fill = (r: [number, number]) => ((lower.inp.value = String(r[0])), (upper.inp.value = String(r[1])));
    const applyRange = () => {
      const read = (i: HTMLInputElement) => (i.value.trim() === '' ? Number.NaN : Number(i.value));
      const s: IbpScale = { mode: 'custom', lower: read(lower.inp), upper: read(upper.inp) };
      const why = ibpScaleError(s);
      invalid(why !== null);
      if (why) return toast(`Not done: ${ch} scale, ${why}`, 'alert');
      put(s);
      toast(`${ch} scale ${span([s.lower, s.upper])} mmHg`);
      paint(true);
    };
    const range = h('div', { class: 'row', hidden: true }, lower.el, upper.el, button('Apply range', applyRange));
    const modes = seg(`${ch} scale`, [['fixed', 'Fixed'], ['custom', 'Range'], ['auto', 'Auto']], cur().mode, (v) => {
      invalid(false);
      if (v === 'custom') {
        const r = startRange();
        fill(r);
        put({ mode: 'custom', lower: r[0], upper: r[1] });
      } else put({ mode: v });
      paint(true);
    });
    let shown = '';
    /** Show the host's scale; the typed numbers are refilled only when it changed (not under the instructor's typing). */
    const paint = (force = false) => {
      const c = cur();
      const key = JSON.stringify(c);
      modes.set(c.mode);
      range.hidden = c.mode !== 'custom';
      if (c.mode === 'custom' && (force || key !== shown)) fill([c.lower, c.upper]);
      shown = key;
      setText(now, describeIbpScale(ch, c, host?.ibpFixedRange?.(ch) ?? null, host !== null));
    };
    if (!host) for (const el of [...modes.querySelectorAll('button'), lower.inp, upper.inp]) (el as HTMLButtonElement | HTMLInputElement).disabled = true;
    paint();
    return { el: h('div', { class: 'ibp-scale', 'data-ibp': ch }, h('h4', {}, name), modes, range, now), paint };
  });
  const hint = host
    ? h('p', { class: 'hint' }, `The pressure lanes' scale on the monitor and on the learners' screens. A typed range lies within ${min}–${max} mmHg.`)
    : h('p', { class: 'hint' }, "The scales are set on the instructor's screen: they belong to the monitor's display, which a remote does not hold.");
  return { el: h('section', { class: 'ibp-scales', 'aria-label': 'Pressure lane scales' }, hint, ...rows.map((r) => r.el)), refresh: () => rows.forEach((r) => r.paint()) };
}
