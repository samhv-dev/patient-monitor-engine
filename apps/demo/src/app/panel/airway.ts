// Airway & ventilation (research/13 §4.3 item 4): airway state, who breathes (spontaneous, bag-mask, ventilator) with
// the ventilator's settings in clinical units, oxygen for the spontaneously breathing patient (E121b: off, nasal
// cannula or face mask with its flow), lung conditions from the lung catalogue with their graded severities and side,
// and the full ventilator one tap away (the cockpit beside this monitor).
import { LUNG_CONDITIONS } from '@pme/engine-core';
import { lungCondition, ventilation } from '../../physiology-console/actions.ts';
import { describeCommand } from '../describe.ts';
import { O2_DEFAULT, O2_FLOWS, o2Fio2, oxygen, oxygenBlock, type O2Device } from '../oxygen.ts';
import { hrefOf } from '../router.ts';
import { button, h, seg, select, setText, stepper } from '../ui.ts';
import { lungDetail, lungLabel } from '../glossary.ts';
import type { PanelCtx } from './ctx.ts';

/** The airway states the sheet stages (the builder's Script offers the same, builder/script-commands.ts). */
export const AIRWAY: Array<[string, string]> = [
  ['patent', 'Patent'], ['obstructed', 'Obstructed'], ['bronchospasm', 'Bronchospasm'], ['apnoea', 'Apnoea'], ['disconnected', 'Circuit disconnected'],
  ['oesophageal', 'Tube in the oesophagus'], ['endobronchial', 'Tube endobronchial'],
];

/** Who breathes, in the sheet's words. */
export const BREATHING: Array<[string, string]> = [['spontaneous', 'Spontaneous'], ['bvm', 'Bag-mask'], ['ventilator', 'Ventilator']];
/** The bag's and the ventilator's settings: the sheet's steppers (their limits, steps and first values). */
export const VENT_LIMITS = {
  rr: { label: 'Rate', unit: '/min', min: 4, max: 40, step: 1, value: 12 },
  vt: { label: 'Tidal volume', unit: 'mL', min: 50, max: 1000, step: 10, value: 500 },
  peep: { label: 'PEEP', unit: 'cmH₂O', min: 0, max: 25, step: 1, value: 5 },
  fio2: { label: 'FiO₂', unit: '%', min: 21, max: 100, step: 1, value: 50 },
} as const;
/** The oxygen devices, in the sheet's words. */
export const O2_CHOICES: Array<[O2Device, string]> = [['none', 'Off (room air)'], ['nasal', 'Nasal cannula'], ['mask', 'Face mask']];
/** The lung conditions the sheet stages (the catalogue's, pregnancy aside), its severities and its sides (the builder's
 *  Script offers the same, builder/script-commands.ts). */
export const LUNG_CHOICES = LUNG_CONDITIONS.filter((x) => x.id !== 'pregnancy');
export const LUNG_SEVERITY: Array<[string, string]> = [['0.33', 'Mild'], ['0.67', 'Moderate'], ['1', 'Severe']];
export const LUNG_SIDES: Array<['L' | 'R', string]> = [['L', 'Left'], ['R', 'Right']];
/** The sheet's airway command. */
export const airwayCmd = (state: string): Record<string, unknown> => ({ type: 'applyEvent', event: { kind: 'airway', state } });
/** The sheet's breathing command: the FiO₂ is typed in %. */
export const breathingCmd = (source: string, rr: number, vtMl: number, peep: number, fio2Pct: number): Record<string, unknown> => ventilation(source, rr, vtMl, peep, fio2Pct / 100);

export function airwayTab(c: PanelCtx): HTMLElement {
  const { staging } = c;
  const stage = (cmd: Record<string, unknown>, key: string) => staging.submit(cmd as never, key, describeCommand(cmd));

  const airway = select('Airway', AIRWAY, 'patent');
  const airwayRow = h('div', { class: 'row' }, airway.el, button('Stage', () => stage(airwayCmd(airway.sel.value), 'airway')));

  let source = 'spontaneous';
  const rr = stepper({ ...VENT_LIMITS.rr });
  const vt = stepper({ ...VENT_LIMITS.vt });
  const peep = stepper({ ...VENT_LIMITS.peep });
  const fio2 = stepper({ ...VENT_LIMITS.fio2 });
  const settings = h('div', { class: 'grid2' }, f('Rate (/min)', rr.el), f('Tidal volume (mL)', vt.el), f('PEEP (cmH₂O)', peep.el), f('FiO₂ (%)', fio2.el));
  const src = seg<string>('Breathing', BREATHING, source, (v) => {
    source = v;
    settings.hidden = v === 'spontaneous';
  });
  settings.hidden = true;

  // E121b: oxygen for the spontaneously breathing patient, given like a drug; room air until it is given. Only while
  // the patient breathes spontaneously with no airway device, bag or ventilator (oxygenBlock): its event would take
  // the patient off them, so in that state the control is disabled, a staged oxygen is taken back, and nothing is sent.
  let o2: O2Device = 'none';
  const flow = select('Flow', [], '');
  const o2Hint = h('p', { class: 'hint' });
  const fio2Now = () => c.link.ctl.state?.values?.fio2;
  const block = () => oxygenBlock(c.link.ctl.state?.breathing, staging.has('ventilation'), fio2Now());
  // UI review #13: the hint says what is true. Blocked: what is in use and its FiO₂, with no option pressed (neither
  // room air nor a mask is what the patient has). Free: what Stage would give, and the patient's FiO₂ now when it differs
  // (a card's "Preoxygenate: 100 % O₂" is not what the control last staged).
  const showO2 = () => {
    const why = block();
    const pct = Math.round(o2Fio2(o2, Number(flow.sel.value)) * 100);
    const now = fio2Now();
    const nowPct = typeof now === 'number' ? Math.round(now * 100) : pct;
    if (why) for (const b of o2Seg.querySelectorAll('button')) b.setAttribute('aria-pressed', 'false');
    else o2Seg.set(o2);
    setText(o2Hint, why ?? `${o2 === 'none' ? 'Room air: FiO₂' : 'FiO₂ about'} ${pct} %.${nowPct === pct ? '' : ` Now FiO₂ ${nowPct} %.`}`);
  };
  const syncO2 = () => {
    flow.sel.replaceChildren(...O2_FLOWS[o2].map((x) => h('option', { value: String(x) }, `${x} L/min`)));
    flow.sel.value = String(O2_DEFAULT[o2]);
    flow.el.hidden = o2 === 'none';
    showO2();
  };
  const o2Seg = seg<O2Device>('Oxygen', O2_CHOICES, o2, (v) => ((o2 = v), syncO2()));
  flow.sel.addEventListener('change', showO2);
  const o2Stage = button('Stage', () => {
    if (block()) return showO2(); // never sent while the bag, a ventilator or an airway device is in use
    stage(oxygen(o2, Number(flow.sel.value)), 'oxygen');
  });
  const gateO2 = () => {
    const off = block() !== null;
    for (const b of o2Seg.querySelectorAll('button')) b.disabled = off;
    flow.sel.disabled = off;
    o2Stage.disabled = off;
    if (off && staging.has('oxygen')) staging.drop('oxygen');
    showO2();
  };
  syncO2();
  gateO2();
  c.onRefresh(gateO2);

  const conds = LUNG_CHOICES;
  // short names from the glossary (Task 26); the catalogue's full text is each option's tooltip and the hint below
  const cond = select('Condition', conds.map((x) => [x.id, lungLabel(x.id, x.label)]), conds[0]?.id ?? '');
  for (const o of cond.sel.options) o.title = lungDetail(conds.find((x) => x.id === o.value)?.label ?? '');
  const condHint = h('p', { class: 'hint' });
  let severity = 0.67;
  const sev = seg<string>('Severity', LUNG_SEVERITY, '0.67', (v) => (severity = Number(v)));
  let side: '' | 'L' | 'R' = '';
  const sideSeg = seg<'' | 'L' | 'R'>('Side', LUNG_SIDES, 'R', (v) => (side = v));
  const syncSide = () => {
    const d = conds.find((x) => x.id === cond.sel.value);
    setText(condHint, lungDetail(d?.label ?? ''));
    sideSeg.hidden = !d?.sided;
    side = d?.sided ? (d.defaultSide ?? 'R') : '';
    if (side) sideSeg.set(side);
  };
  cond.sel.addEventListener('change', syncSide);
  syncSide();

  return h('div', {},
    h('h3', {}, 'Airway'), airwayRow,
    h('h3', {}, 'Breathing'), src, settings,
    h('div', { class: 'row' },
      button('Stage', () => stage(breathingCmd(source, rr.value, vt.value, peep.value, fio2.value), 'ventilation')),
      h('a', { class: 'btn ghost', href: hrefOf('vent') }, 'Open the ventilator')),
    h('h3', {}, 'Oxygen'), o2Seg, flow.el, o2Hint,
    h('div', { class: 'row' }, o2Stage),
    h('h3', {}, 'Lung condition'), cond.el, condHint, sev, sideSeg,
    h('div', { class: 'row' },
      button('Stage', () => stage(lungCondition(cond.sel.value, severity, side), `lung-${cond.sel.value}`)),
      button('Remove', () => stage(lungCondition(cond.sel.value, 0, side), `lung-${cond.sel.value}`), 'ghost')),
  );
}

const f = (text: string, control: HTMLElement): HTMLElement => h('div', { class: 'field' }, h('span', {}, text), control);
