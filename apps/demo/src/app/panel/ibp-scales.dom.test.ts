// @vitest-environment happy-dom
// E130: the Devices tab (today's Instructor view) and the Devices sheet of Instructor v2 (which mounts the same tab) set
// the IBP1 and IBP2 lane scales: Fixed (the skin's own), a typed Range within 0–200 mmHg, or Auto. The control shows
// the mode and the numbers, refuses a range outside 0–200 or with lower ≥ upper (in a toast, nothing applied), and on a
// Remote, which holds no monitor, says where the scale is set instead of offering it.
import { beforeEach, describe, expect, it } from 'vitest';
import type { IbpChannel, IbpScales } from '@pme/renderer';
import type { Link } from '../link.ts';
import type { PanelCtx } from './ctx.ts';
import { devicesTab } from './devices.ts';
import { SHEETS } from '../teach2/sheets.ts';

function fakeHost(fixed: Record<IbpChannel, [number, number] | null> = { IBP1: [0, 200], IBP2: [-10, 30] }) {
  const set: IbpScales[] = [];
  const host = {
    ibpScales: {} as IbpScales,
    setIbpScales(s: IbpScales) {
      set.push(s);
      host.ibpScales = s;
    },
    ibpFixedRange: (ch: IbpChannel) => fixed[ch],
    spec: { attached: false },
    soundOn: false,
  };
  return { host, set };
}

function rig(host: ReturnType<typeof fakeHost>['host'] | null, body = devicesTab) {
  const link = {
    alarms: null, host, simT: 0,
    ctl: { simT: 0, scenario: { doc: null }, bookmarks: [] },
    send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }),
    onChange: () => () => undefined,
  } as unknown as Link;
  let refresh = () => undefined as void;
  const ctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
  const el = body(ctx);
  document.body.append(el);
  refresh();
  const row = (ch: IbpChannel) => el.querySelector(`[data-ibp="${ch}"]`) as HTMLElement;
  const mode = (ch: IbpChannel, name: string) => [...row(ch).querySelectorAll('button')].find((b) => b.textContent === name) as HTMLButtonElement;
  const field = (ch: IbpChannel, which: 'lower' | 'upper') => row(ch).querySelector(`input[name="${ch.toLowerCase()}-${which}"]`) as HTMLInputElement;
  const now = (ch: IbpChannel) => row(ch).querySelector('[data-ibp-now]')?.textContent;
  const apply = (ch: IbpChannel) => [...row(ch).querySelectorAll('button')].find((b) => b.textContent === 'Apply range') as HTMLButtonElement;
  return { el, row, mode, field, now, apply, refresh: () => refresh() };
}
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);

describe('E130 Devices tab: IBP1 / IBP2 scale control', () => {
  beforeEach(() => document.body.replaceChildren());

  it('shows both channels with the skin\'s fixed scale and its numbers by default', () => {
    const { host } = fakeHost();
    const r = rig(host);
    expect(r.row('IBP1')).toBeTruthy();
    expect(r.row('IBP2')).toBeTruthy();
    expect(r.mode('IBP1', 'Fixed').getAttribute('aria-pressed')).toBe('true');
    expect(r.now('IBP1')).toBe('Fixed 0–200 mmHg (the monitor\'s own scale)');
    expect(r.now('IBP2')).toBe('Fixed −10–30 mmHg (the monitor\'s own scale)');
    expect(r.field('IBP1', 'lower').closest('[hidden]')).not.toBeNull(); // the typed range only in Range mode
  });

  it('Auto: sets the channel to AUTO and says the cadence and the ranges', () => {
    const { host, set } = fakeHost();
    const r = rig(host);
    r.mode('IBP1', 'Auto').click();
    expect(set.at(-1)).toEqual({ IBP1: { mode: 'auto' } });
    expect(r.mode('IBP1', 'Auto').getAttribute('aria-pressed')).toBe('true');
    expect(r.now('IBP1')).toBe('Auto: judged every 30 s from 0–60, 0–100, 0–160, 0–200 mmHg');
    r.mode('IBP2', 'Auto').click();
    expect(set.at(-1)).toEqual({ IBP1: { mode: 'auto' }, IBP2: { mode: 'auto' } }); // per channel, the other kept
    expect(r.now('IBP2')).toBe('Auto: judged every 30 s from −10–30, 0–60, 0–100, 0–160, 0–200 mmHg');
  });

  it('Range: typed lower and upper within 0–200 apply; the numbers are shown', () => {
    const { host, set } = fakeHost();
    const r = rig(host);
    r.mode('IBP1', 'Range').click();
    expect(r.field('IBP1', 'lower').closest('[hidden]')).toBeNull();
    expect([r.field('IBP1', 'lower').value, r.field('IBP1', 'upper').value]).toEqual(['0', '200']); // from the current scale
    expect(set.at(-1)).toEqual({ IBP1: { mode: 'custom', lower: 0, upper: 200 } });
    r.field('IBP1', 'lower').value = '20';
    r.field('IBP1', 'upper').value = '180';
    r.apply('IBP1').click();
    expect(set.at(-1)).toEqual({ IBP1: { mode: 'custom', lower: 20, upper: 180 } });
    expect(r.now('IBP1')).toBe('Range 20–180 mmHg');
    // the venous fixed −10–30 starts the typed range at 0–30 (a typed range lies within 0–200)
    r.mode('IBP2', 'Range').click();
    expect([r.field('IBP2', 'lower').value, r.field('IBP2', 'upper').value]).toEqual(['0', '30']);
  });

  it('refuses a range outside 0–200 or with lower ≥ upper, in a toast; nothing is applied', () => {
    const { host, set } = fakeHost();
    const r = rig(host);
    r.mode('IBP1', 'Range').click();
    const before = set.length;
    for (const [lo, hi] of [['-5', '100'], ['0', '250'], ['120', '80'], ['', '100']]) {
      r.field('IBP1', 'lower').value = lo!;
      r.field('IBP1', 'upper').value = hi!;
      r.apply('IBP1').click();
    }
    expect(set.length).toBe(before);
    expect(toasts().filter((t) => t?.startsWith('Not done'))).toHaveLength(4);
    expect(r.field('IBP1', 'lower').getAttribute('aria-invalid')).toBe('true');
    expect(r.now('IBP1')).toBe('Range 0–200 mmHg');
  });

  it('Fixed returns the channel to the skin\'s scale', () => {
    const { host, set } = fakeHost();
    const r = rig(host);
    r.mode('IBP1', 'Auto').click();
    r.mode('IBP1', 'Fixed').click();
    expect(set.at(-1)).toEqual({});
    expect(r.now('IBP1')).toBe('Fixed 0–200 mmHg (the monitor\'s own scale)');
  });

  it('follows a change made elsewhere (the other view) at the next repaint', () => {
    const { host } = fakeHost();
    const r = rig(host);
    host.ibpScales = { IBP2: { mode: 'custom', lower: 0, upper: 40 } };
    r.refresh();
    expect(r.mode('IBP2', 'Range').getAttribute('aria-pressed')).toBe('true');
    expect(r.now('IBP2')).toBe('Range 0–40 mmHg');
  });

  it('a skin with no such lane says so for the fixed scale', () => {
    const { host } = fakeHost({ IBP1: [0, 150], IBP2: null });
    const r = rig(host);
    expect(r.now('IBP1')).toBe('Fixed 0–150 mmHg (the monitor\'s own scale)');
    expect(r.now('IBP2')).toBe('Fixed (the monitor\'s own scale; no IBP2 lane on this monitor)');
  });

  it('on a Remote the control is shown disabled with where the scale is set', () => {
    const r = rig(null);
    expect(r.mode('IBP1', 'Auto').disabled).toBe(true);
    expect(r.el.textContent).toContain('The scales are set on the instructor\'s screen');
  });

  it('Instructor v2: the Devices sheet shows the same control', () => {
    const { host, set } = fakeHost();
    const body = SHEETS.find((s) => s.id === 'devices')?.body as (c: PanelCtx) => HTMLElement;
    const r = rig(host, body);
    r.mode('IBP1', 'Auto').click();
    expect(set.at(-1)).toEqual({ IBP1: { mode: 'auto' } });
    expect(r.now('IBP1')).toContain('Auto');
  });
});
