// Defib, pacing & CPR (research/13 §4.3 item 5). Shock, charge and CPR are urgent: they apply at once, never staged
// (research/13 P6). The defibrillator state (charging, ready, shocks delivered, last outcome) mirrors the engine's
// `deviceStatus`, so the instructor sees what the learner's defibrillator is doing.
import type { Skin } from '@pme/skins';
import { describeCommand } from '../describe.ts';
import { defibDefaults } from '../site.ts';
import { button, h, seg, setText, stepper, toast, toggle } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const OUTCOME: Readonly<Record<string, string>> = { unchanged: 'no change', vf: 'VF', asystole: 'asystole', pea: 'PEA', rosc: 'return of circulation', sinus: 'sinus rhythm' };

/** A defibrillator's AED ladder as the panel's energy presets (none without one). */
export const presetsOf = (d: Partial<NonNullable<Skin['defib']>>): number[] => [...(d.aedSequenceJ ?? [])];

/** The energy stepper's limits (its first value is the room's defibrillator model's adult energy, site.ts). */
export const ENERGY_LIMITS = { label: 'Energy', unit: 'J', min: 1, max: 360, step: 10 } as const;
/** The pacer's modes and steppers, in the sheet's words. */
export const PACER_MODES: Array<['off' | 'demand' | 'fixed', string]> = [['off', 'Off'], ['demand', 'Demand'], ['fixed', 'Fixed']];
export const PACER_LIMITS = {
  rate: { label: 'Pacing rate', unit: '/min', min: 30, max: 180, step: 5, value: 70 },
  ma: { label: 'Pacing current', unit: 'mA', min: 0, max: 200, step: 5, value: 70 },
} as const;
/** CPR's rate stepper and its quality choices. */
export const CPR_RATE = { label: 'Compression rate', unit: '/min', min: 60, max: 150, step: 5, value: 110 } as const;
export const CPR_QUALITY: Array<[string, string]> = [['0.4', 'Poor'], ['0.8', 'Good'], ['1', 'Excellent']];
/** The sheet's commands: a defibrillator action (charge and shock carry the energy), the pacer, CPR started or stopped. */
export const defibCmd = (action: string, energyJ?: number): Record<string, unknown> =>
  ({ type: 'applyEvent', event: energyJ === undefined ? { kind: 'defib', action } : { kind: 'defib', action, energyJ } });
export const pacerCmd = (mode: string, ratePpm: number, mA: number): Record<string, unknown> => ({ type: 'applyEvent', event: { kind: 'pacer', mode, ratePpm, mA } });
export const cprCmd = (active: boolean, rate?: number, quality?: number): Record<string, unknown> =>
  ({ type: 'applyEvent', event: active ? { kind: 'cpr', active: true, rate, quality } : { kind: 'cpr', active: false } });

export function defibTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  const now = async (cmd: Record<string, unknown>) => {
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `Not done: ${r.reason ?? 'refused'}`);
  };

  // R5b: the energy starts at the room's defibrillator model's adult energy (200 J with no model, as before) and moves to
  // a new model's at the next repaint; the model's AED ladder, when it has one, is a row of presets
  let model = c.site.defibModel;
  let defaults = defibDefaults(model);
  const energy = stepper({ ...ENERGY_LIMITS, value: defaults.energyAdultJ });
  const presets = h('div', { class: 'row defib-presets', role: 'group', 'aria-label': 'Energy presets' });
  const drawPresets = () => {
    const ladder = presetsOf({ aedSequenceJ: defaults.ladderJ });
    presets.replaceChildren(...ladder.map((j) => button(`${j} J`, () => energy.set(j), 'small')));
    if (ladder.length) defib.insertBefore(presets, defib.children[1] ?? null);
    else presets.remove();
  };
  const state = h('p', { class: 'hint', role: 'status' });
  const sync = toggle('Synchronised', false, (on) => void now(defibCmd(on ? 'syncOn' : 'syncOff')), 'small');
  const defib = h('div', {},
    h('div', { class: 'row' }, h('div', { class: 'field' }, h('span', {}, 'Energy (J)'), energy.el), sync),
    h('div', { class: 'row' },
      button('Charge', () => void now(defibCmd('charge', energy.value))),
      button('Shock', () => void now(defibCmd('shock', energy.value)), 'primary'),
      button('Disarm', () => void now(defibCmd('disarm')), 'ghost')),
    state);
  drawPresets();

  let mode: 'off' | 'demand' | 'fixed' = 'off';
  const pmode = seg<'off' | 'demand' | 'fixed'>('Pacer mode', PACER_MODES, mode, (v) => (mode = v));
  const rate = stepper({ ...PACER_LIMITS.rate });
  const ma = stepper({ ...PACER_LIMITS.ma });
  const pacer = h('div', {}, pmode, h('div', { class: 'grid2' }, h('div', { class: 'field' }, h('span', {}, 'Rate (/min)'), rate.el), h('div', { class: 'field' }, h('span', {}, 'Current (mA)'), ma.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = pacerCmd(mode, rate.value, ma.value);
      staging.submit(cmd as never, 'pacer', describeCommand(cmd));
    })));

  const cprRate = stepper({ ...CPR_RATE });
  let quality = 0.8;
  const q = seg<string>('Compression quality', CPR_QUALITY, '0.8', (v) => (quality = Number(v)));
  const cpr = h('div', {}, h('div', { class: 'row' }, h('div', { class: 'field' }, h('span', {}, 'Rate (/min)'), cprRate.el), q),
    h('div', { class: 'row' },
      button('Start CPR', () => void now(cprCmd(true, cprRate.value, quality)), 'primary'),
      button('Stop CPR', () => void now(cprCmd(false)))));

  c.onRefresh(() => {
    if (c.site.defibModel !== model) {
      model = c.site.defibModel;
      defaults = defibDefaults(model);
      energy.set(defaults.energyAdultJ);
      drawPresets();
    }
    const d = link.device?.defib;
    if (!d) return setText(state, 'Defibrillator idle');
    const last = d.lastShock ? `; last shock ${d.lastShock.energyJ} J, ${OUTCOME[d.lastShock.outcome] ?? 'rhythm changed'}` : '';
    setText(state, `${d.state === 'charging' ? 'Charging' : d.state === 'ready' ? `Charged to ${d.energyJ} J: ready to shock` : 'Idle'}; ${d.shocks} shock${d.shocks === 1 ? '' : 's'} delivered${last}`);
    sync.set(d.sync);
  });

  return h('div', {}, h('h3', {}, 'Defibrillator'), defib, h('h3', {}, 'Pacing'), pacer, h('h3', {}, 'CPR'), cpr);
}
