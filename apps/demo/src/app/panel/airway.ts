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

const AIRWAY: Array<[string, string]> = [
  ['patent', 'Patent'], ['obstructed', 'Obstructed'], ['bronchospasm', 'Bronchospasm'], ['apnoea', 'Apnoea'], ['disconnected', 'Circuit disconnected'],
  ['oesophageal', 'Tube in the oesophagus'], ['endobronchial', 'Tube endobronchial'],
];

export function airwayTab(c: PanelCtx): HTMLElement {
  const { staging } = c;
  const stage = (cmd: Record<string, unknown>, key: string) => staging.submit(cmd as never, key, describeCommand(cmd));

  const airway = select('Airway', AIRWAY, 'patent');
  const airwayRow = h('div', { class: 'row' }, airway.el, button('Stage', () => stage({ type: 'applyEvent', event: { kind: 'airway', state: airway.sel.value } }, 'airway')));

  let source = 'spontaneous';
  const rr = stepper({ label: 'Rate', unit: '/min', min: 4, max: 40, step: 1, value: 12 });
  const vt = stepper({ label: 'Tidal volume', unit: 'mL', min: 50, max: 1000, step: 10, value: 500 });
  const peep = stepper({ label: 'PEEP', unit: 'cmH₂O', min: 0, max: 25, step: 1, value: 5 });
  const fio2 = stepper({ label: 'FiO₂', unit: '%', min: 21, max: 100, step: 1, value: 50 });
  const settings = h('div', { class: 'grid2' }, f('Rate (/min)', rr.el), f('Tidal volume (mL)', vt.el), f('PEEP (cmH₂O)', peep.el), f('FiO₂ (%)', fio2.el));
  const src = seg<string>('Breathing', [['spontaneous', 'Spontaneous'], ['bvm', 'Bag-mask'], ['ventilator', 'Ventilator']], source, (v) => {
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
  const block = () => oxygenBlock(c.link.ctl.state?.breathing, staging.has('ventilation'));
  const showO2 = () => {
    const why = block();
    const pct = Math.round(o2Fio2(o2, Number(flow.sel.value)) * 100);
    setText(o2Hint, why ?? `${o2 === 'none' ? 'Room air: FiO₂' : 'FiO₂ about'} ${pct} %.`);
  };
  const syncO2 = () => {
    flow.sel.replaceChildren(...O2_FLOWS[o2].map((x) => h('option', { value: String(x) }, `${x} L/min`)));
    flow.sel.value = String(O2_DEFAULT[o2]);
    flow.el.hidden = o2 === 'none';
    showO2();
  };
  const o2Seg = seg<O2Device>('Oxygen', [['none', 'Off (room air)'], ['nasal', 'Nasal cannula'], ['mask', 'Face mask']], o2, (v) => ((o2 = v), syncO2()));
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

  const conds = LUNG_CONDITIONS.filter((x) => x.id !== 'pregnancy');
  // short names from the glossary (Task 26); the catalogue's full text is each option's tooltip and the hint below
  const cond = select('Condition', conds.map((x) => [x.id, lungLabel(x.id, x.label)]), conds[0]?.id ?? '');
  for (const o of cond.sel.options) o.title = lungDetail(conds.find((x) => x.id === o.value)?.label ?? '');
  const condHint = h('p', { class: 'hint' });
  let severity = 0.67;
  const sev = seg<string>('Severity', [['0.33', 'Mild'], ['0.67', 'Moderate'], ['1', 'Severe']], '0.67', (v) => (severity = Number(v)));
  let side: '' | 'L' | 'R' = '';
  const sideSeg = seg<'' | 'L' | 'R'>('Side', [['L', 'Left'], ['R', 'Right']], 'R', (v) => (side = v));
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
      button('Stage', () => stage(ventilation(source, rr.value, vt.value, peep.value, fio2.value / 100), 'ventilation')),
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
