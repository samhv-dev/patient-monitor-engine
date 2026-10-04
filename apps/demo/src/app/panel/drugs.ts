// Drugs & fluids (research/13 brief §7 "Dose picker"): find a drug by name (or another name: "noradrenaline"), pick a
// preset or type a dose, see the absolute dose for this patient's weight, then Give (applies now: a bolus is urgent)
// or Stage it with the other changes. Infusions keep a running list with rate change and stop. The vaporiser and
// fluids sit below. Doses go to the engine in the units shown; the engine converts (7g `toAmount`).
import type { ClinicalEvent } from '@pme/controller';
import { bleed, fluid, infusion, vaporiser } from '../../physiology-console/actions.ts';
import { describeCommand } from '../describe.ts';
import { doseUnits, findDrugs, perKg, rateUnits, unitText, type DrugItem } from '../drugs.ts';
import { button, h, input, seg, setText, stepper, toast } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

const CLASS: Readonly<Record<string, string>> = {
  hypnotic: 'Hypnotic', opioid: 'Opioid', benzodiazepine: 'Benzodiazepine', ketamine: 'Dissociative', alpha2: 'α₂ agonist', volatile: 'Volatile anaesthetic',
  nmb: 'Neuromuscular blocker', depolariser: 'Depolarising blocker', nmbReversal: 'Reversal (encapsulation)', anticholinesterase: 'Anticholinesterase',
  anticholinergic: 'Anticholinergic', alpha1: 'α₁ agonist', mixedAdrenergic: 'Adrenergic agonist', betaAgonist: 'β agonist', vasopressin: 'Vasopressin',
  pde3: 'PDE3 inhibitor', betaBlocker: 'β blocker', antiarrhythmic: 'Antiarrhythmic', adenosine: 'Adenosine', vasodilator: 'Vasodilator',
  electrolyte: 'Electrolyte', metabolic: 'Metabolic', opioidAntagonist: 'Opioid antagonist', benzoAntagonist: 'Benzodiazepine antagonist',
  localAnaesthetic: 'Local anaesthetic', lipid: 'Lipid emulsion', dantrolene: 'Dantrolene', diuretic: 'Diuretic', osmotic: 'Osmotic agent',
};

export function drugsTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  let drug: DrugItem | null = null;
  let route: 'bolus' | 'infusion' = 'bolus';
  const running = new Map<string, { name: string; rate: number; unit: string }>();

  // ---- search ----
  const q = input('Find a drug', { type: 'search', placeholder: 'Drug name, for example noradrenaline', autocomplete: 'off' });
  const results = h('div', { class: 'chips results', role: 'list', 'aria-label': 'Matching drugs' });
  const drawResults = () => {
    const list = findDrugs(q.inp.value).slice(0, q.inp.value ? 12 : 10);
    results.replaceChildren(...list.map((d) => h('button', { type: 'button', role: 'listitem', class: 'chip-btn', 'aria-pressed': String(drug?.id === d.id), onclick: () => pick(d) }, d.name)));
  };
  q.inp.addEventListener('input', drawResults);
  q.inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = findDrugs(q.inp.value)[0];
      if (first) pick(first);
    }
  });

  // ---- dose card ----
  const card = h('div', { class: 'card dose', hidden: true });
  const name = h('h4', {});
  const cls = h('p', { class: 'hint' });
  const routeSeg = seg<'bolus' | 'infusion'>('Route', [['bolus', 'IV bolus'], ['infusion', 'Infusion']], 'bolus', (v) => ((route = v), drawDose()));
  const presets = h('div', { class: 'chips' });
  const dose = stepper({ label: 'Dose', unit: '', min: 0, max: 100000, step: 1, value: 0, digits: 2, onchange: () => drawKg() });
  const unitSel = h('select', { class: 'input unitsel', 'aria-label': 'Dose unit', onchange: () => drawKg() });
  const kg = h('p', { class: 'hint num' });
  const give = button('Give now', () => void giveNow(), 'primary');
  const stage = button('Stage', () => {
    const cmd = build();
    if (cmd) staging.submit(cmd as never, `drug-${drug?.id}-${route}`, describeCommand(cmd));
  });
  card.append(name, cls, routeSeg, presets, h('div', { class: 'row' }, dose.el, unitSel), kg, h('div', { class: 'row' }, give, stage));

  const build = (): Record<string, unknown> | null => {
    if (!drug || !(dose.value > 0)) return null;
    return route === 'bolus'
      ? { type: 'applyEvent', event: { kind: 'drug', drugId: drug.id, dose: dose.value, unit: unitSel.value, route: 'iv' } as unknown as ClinicalEvent }
      : infusion(drug.id, dose.value, unitSel.value);
  };
  const giveNow = async () => {
    const cmd = build();
    if (!cmd || !drug) return;
    const r = await link.send(cmd as never);
    toast(r.accepted ? describeCommand(cmd) : `${drug.name}: not given (${r.reason ?? 'refused'})`);
    if (r.accepted && route === 'infusion') {
      running.set(drug.id, { name: drug.name, rate: dose.value, unit: unitSel.value });
      drawRunning();
    }
  };
  const pick = (d: DrugItem) => {
    drug = d;
    route = d.preset.bolus || !d.preset.infusion ? 'bolus' : 'infusion';
    routeSeg.set(route);
    setText(name, d.name);
    setText(cls, CLASS[d.cls] ?? '');
    card.hidden = false;
    drawResults();
    drawDose();
  };
  const drawDose = () => {
    if (!drug) return;
    const units: string[] = route === 'bolus' ? doseUnits(drug) : rateUnits(drug);
    unitSel.replaceChildren(...units.map((u) => h('option', { value: u }, unitText(u))));
    const list = (route === 'bolus' ? drug.preset.bolus : drug.preset.infusion) ?? [];
    presets.replaceChildren(...list.map(([v, u]) => h('button', { type: 'button', class: 'chip-btn', onclick: () => {
      if (![...unitSel.options].some((o) => o.value === u)) unitSel.append(h('option', { value: u }, unitText(u)));
      unitSel.value = u;
      dose.set(v);
      drawKg();
    } }, `${v} ${unitText(u)}`)));
    const first = list[0];
    if (first) {
      if (![...unitSel.options].some((o) => o.value === first[1])) unitSel.append(h('option', { value: first[1] }, unitText(first[1])));
      unitSel.value = first[1];
      dose.set(first[0]);
    } else dose.set(0);
    give.textContent = route === 'bolus' ? 'Give now' : 'Start infusion';
    drawKg();
  };
  const drawKg = () => setText(kg, perKg(dose.value, unitSel.value, c.weightKg()) || `Patient ${c.weightKg()} kg`);

  // ---- running infusions ----
  const runList = h('ul', { class: 'infusions' });
  const drawRunning = () => {
    runList.replaceChildren(...[...running.entries()].map(([id, r]) => h('li', {},
      h('span', {}, `${r.name} ${r.rate} ${unitText(r.unit)}`),
      button('Stop', async () => {
        const cmd = infusion(id, 0, r.unit);
        const a = await link.send(cmd as never);
        if (a.accepted) {
          running.delete(id);
          drawRunning();
          toast(`${r.name} infusion stopped`);
        }
      }, 'ghost small'))));
    if (!running.size) runList.replaceChildren(h('li', { class: 'muted' }, 'No infusions running. Choose a drug above and pick Infusion.'));
  };
  drawRunning();

  // ---- vaporiser ----
  let agent = 'sevoflurane';
  const agentSeg = seg<string>('Agent', [['sevoflurane', 'Sevoflurane'], ['isoflurane', 'Isoflurane'], ['desflurane', 'Desflurane']], agent, (v) => (agent = v));
  const dial = stepper({ label: 'Dial', unit: '%', min: 0, max: 18, step: 0.5, value: 2, digits: 1 });
  const fgf = stepper({ label: 'Fresh gas flow', unit: 'L/min', min: 0.2, max: 15, step: 0.5, value: 2, digits: 1 });
  const vap = h('div', {},
    agentSeg, h('div', { class: 'grid2' }, lab('Dial (%)', dial.el), lab('Fresh gas (L/min)', fgf.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = vaporiser(agent, dial.value, fgf.value);
      staging.submit(cmd as never, 'vaporiser', describeCommand(cmd));
    }), button('Vaporiser off', () => {
      const cmd = vaporiser(agent, 0, fgf.value);
      staging.submit(cmd as never, 'vaporiser', describeCommand(cmd));
    }, 'ghost')));

  // ---- fluids and bleeding ----
  let kind = 'crystalloid';
  const kindSeg = seg<string>('Fluid', [['crystalloid', 'Crystalloid'], ['colloid', 'Colloid'], ['blood', 'Blood']], kind, (v) => (kind = v));
  const vol = stepper({ label: 'Volume', unit: 'mL', min: 50, max: 3000, step: 50, value: 500 });
  const overMin = stepper({ label: 'Over', unit: 'min', min: 1, max: 120, step: 1, value: 10 });
  const loss = stepper({ label: 'Blood loss', unit: 'mL', min: 50, max: 5000, step: 50, value: 500 });
  const lossMin = stepper({ label: 'Blood loss over', unit: 'min', min: 1, max: 120, step: 1, value: 5 });
  const fl = h('div', {},
    kindSeg, h('div', { class: 'grid2' }, lab('Volume (mL)', vol.el), lab('Over (min)', overMin.el)),
    h('div', { class: 'row' }, button('Give', async () => {
      const cmd = fluid(kind, vol.value, overMin.value * 60);
      const r = await link.send(cmd as never);
      toast(r.accepted ? describeCommand(cmd) : 'Fluid not given (see the log)');
    }, 'primary')),
    h('h4', {}, 'Bleeding'), h('div', { class: 'grid2' }, lab('Blood loss (mL)', loss.el), lab('Over (min)', lossMin.el)),
    h('div', { class: 'row' }, button('Stage', () => {
      const cmd = bleed(loss.value, lossMin.value * 60);
      staging.submit(cmd as never, 'bleed', describeCommand(cmd));
    })));

  drawResults();
  return h('div', {}, h('h3', {}, 'Give a drug'), q.el, results, card, h('h3', {}, 'Running infusions'), runList, h('h3', {}, 'Vaporiser'), vap, h('h3', {}, 'Fluids and blood'), fl);
}

const lab = (text: string, control: HTMLElement): HTMLElement => h('div', { class: 'field' }, h('span', {}, text), control);
