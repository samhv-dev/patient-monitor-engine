// Plan pump-rack-tci.md A2, TCI (§4 D2 item 4, D3, D6; §6): target-controlled infusion on a syringe channel. The pump
// asks what a real TCI pump asks: the set (only those the engine has REGISTERED for the programmed drug, TCI_SETS, so a
// set the engine would refuse is not offered), the mode (plasma or effect site), the target, and the patient — age,
// weight, height, sex, and what the set reads beyond them (Eleveld's postmenstrual age and co-administered opioids) —
// with one tap "Copy from the case sheet" (D6: the case's patient, which the learner still sees and may change). A
// typed value outside the population the set was studied in shows the paper's range and is allowed (D6); a refusal
// range is a device behaviour and the SP5 TCI manual's, a gap until it is read, said in the face's words. A set with no
// ke0 says the registry's words beside the effect-site mode; whether the mode runs is the engine's answer. The command
// sets the target; the channel runs at Start (the engine keeps a loaded channel paused until it is started).
import { concUnit, DRUGS, NO_KE0_REFUSAL, TCI_SETS, type TciSet } from '@pme/engine-core';
import { unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import { h } from '../ui.ts';
import { field, FLOW_WORDS, hint, missing, num, numberInput, selectOf, type CasePatient, type FlowDef, type FlowInput } from './form.ts';

export const TCI_WORDS = {
  button: 'TCI',
  title: 'Target-controlled infusion',
  submit: 'Set target',
  done: (ch: number, running: boolean) => (running ? `Target set on channel ${ch}.` : `Target set on channel ${ch}: press Start to run it.`),
  set: 'Model',
  mode: 'Target site',
  modes: [['effect', 'Effect site (Ce)'], ['plasma', 'Plasma (Cp)']] as const,
  target: (unit: string) => `Target (${unit})`,
  patient: 'Patient',
  age: 'Age (years)',
  weight: 'Weight (kg)',
  height: 'Height (cm)',
  sex: 'Sex',
  sexes: [['', 'Choose'], ['m', 'Male'], ['f', 'Female']] as const,
  pma: 'Postmenstrual age (weeks, optional)',
  opioids: 'Opioids given with it',
  yesNo: [['no', 'No'], ['yes', 'Yes']] as const,
  copy: 'Copy from the case sheet',
  noCase: 'The case sheet has no patient yet.',
  programFirst: 'Program the drug first: the TCI models are listed for the programmed drug.',
  noSet: (drug: string) => `No TCI model is registered for ${drug}.`,
  outside: (what: string, v: number, unit: string, set: string, a: number, b: number, src: string) => `${what} ${v} ${unit} is outside the population ${set} was studied in (${a}–${b} ${unit}; ${src})`,
  // the SP5 TCI profile's gaps, in the face's words (D6, D12)
  patientGap: 'patient limits not set from the manual',
  targetGap: 'target range not set from the manual',
  what: { target: 'the target', age: 'the age', weight: 'the weight', height: 'the height', sex: 'the sex' },
};

/** The sets the engine has registered for `drugId`, in the registry's order. */
export const tciSetsFor = (drugId: string): TciSet[] => TCI_SETS.filter((s) => s.meta.drugId === drugId);

const isGap = (v: unknown): boolean => !!v && typeof (v as { gap?: unknown }).gap === 'string';

function tciFlow(x: FlowInput) {
  const drugId = x.row?.programmed?.drugId ?? null;
  const sets = drugId ? tciSetsFor(drugId) : [];
  if (!drugId || sets.length === 0) {
    const why = drugId ? TCI_WORDS.noSet(drugName(drugId)) : TCI_WORDS.programFirst;
    return { el: h('div', { class: 'pf-fields-in' }, hint(why)), build: () => ({ why }) };
  }
  const was = x.row?.tci ?? null;
  const setSel = selectOf('setId', sets.map((s) => [s.meta.id, s.meta.name] as const), was && sets.some((s) => s.meta.id === was.setId) ? was.setId : undefined);
  const mode = selectOf('mode', TCI_WORDS.modes, was?.mode ?? 'effect');
  const row = DRUGS[drugId];
  const target = numberInput('target', { min: 0 });
  if (was?.target != null) target.value = String(was.target);
  const age = numberInput('ageY', { min: 0 });
  const weight = numberInput('weightKg', { min: 0 });
  const height = numberInput('heightCm', { min: 0 });
  const sex = selectOf('sex', TCI_WORDS.sexes, '');
  const pma = numberInput('pmaWeeks', { min: 0 });
  const opioids = selectOf('opioids', TCI_WORDS.yesNo, 'no');
  const pmaField = field(TCI_WORDS.pma, pma);
  const opioidsField = field(TCI_WORDS.opioids, opioids);
  const hints = h('div', { class: 'pf-hints' });
  const sp5 = x.devices?.['sp5-tci'] ?? null;
  const chosen = (): TciSet => sets.find((s) => s.meta.id === setSel.value) ?? (sets[0] as TciSet);
  const draw = () => {
    const s = chosen();
    pmaField.hidden = !s.meta.covariates.includes('pmaWeeks');
    opioidsField.hidden = !s.meta.covariates.includes('opioids');
    const out: string[] = [];
    if (s.meta.ke0.none === true) out.push(NO_KE0_REFUSAL);
    const p = s.meta.population;
    for (const [what, inp, range, unit] of [['Age', age, p.ageY, 'y'], ['Weight', weight, p.weightKg, 'kg'], ['Height', height, p.heightCm, 'cm']] as const) {
      const v = num(inp.value);
      if (v !== null && range && (v < range[0] || v > range[1])) out.push(TCI_WORDS.outside(what, v, unit, s.meta.name, range[0], range[1], p.src));
    }
    if (!sp5) out.push(FLOW_WORDS.noProfile);
    else {
      if (isGap(sp5.tci.patient)) out.push(TCI_WORDS.patientGap);
      if (isGap(sp5.tci.targetRange)) out.push(TCI_WORDS.targetGap);
    }
    hints.replaceChildren(...out.map(hint));
  };
  const copied = h('p', { class: 'pf-hint small', role: 'status' });
  const copy = h('button', { type: 'button', class: 'btn pf-copy', onclick: () => void x.casePatient().then((c: CasePatient | null) => {
    if (!c) return void (copied.textContent = TCI_WORDS.noCase);
    age.value = String(c.ageY);
    weight.value = String(c.weightKg);
    height.value = String(c.heightCm);
    sex.value = c.sex;
    copied.textContent = '';
    draw();
  }) }, TCI_WORDS.copy);
  const el = h('div', { class: 'pf-fields-in' }, field(TCI_WORDS.set, setSel),
    h('div', { class: 'pf-row' }, field(TCI_WORDS.mode, mode), field(TCI_WORDS.target(unitText(row ? concUnit(row) : '')), target)),
    h('fieldset', { class: 'pf-patient' }, h('legend', {}, TCI_WORDS.patient), copy, copied,
      h('div', { class: 'pf-row' }, field(TCI_WORDS.age, age), field(TCI_WORDS.weight, weight)),
      h('div', { class: 'pf-row' }, field(TCI_WORDS.height, height), field(TCI_WORDS.sex, sex)),
      pmaField, opioidsField),
    hints);
  el.addEventListener('input', draw);
  el.addEventListener('change', draw);
  draw();
  return {
    el,
    build() {
      const s = chosen();
      const t = num(target.value);
      if (t === null) return missing(TCI_WORDS.what.target);
      const a = num(age.value);
      if (a === null) return missing(TCI_WORDS.what.age);
      const w = num(weight.value);
      if (w === null) return missing(TCI_WORDS.what.weight);
      const ht = num(height.value);
      if (ht === null) return missing(TCI_WORDS.what.height);
      if (sex.value !== 'm' && sex.value !== 'f') return missing(TCI_WORDS.what.sex);
      const patient: Record<string, unknown> = { ageY: a, weightKg: w, heightCm: ht, sex: sex.value };
      const pw = s.meta.covariates.includes('pmaWeeks') ? num(pma.value) : null;
      if (pw !== null) patient.pmaWeeks = pw;
      if (s.meta.covariates.includes('opioids') && opioids.value === 'yes') patient.opioids = true; // 'no' is the engine's default when unsaid
      return { type: 'pump' as const, ch: x.ch, action: 'tci', setId: s.meta.id, mode: mode.value, target: t, patient };
    },
  };
}

export const TCI: FlowDef = {
  id: 'tci', button: TCI_WORDS.button, title: TCI_WORDS.title, submit: TCI_WORDS.submit, kinds: ['syringe'], make: tciFlow,
  done: (ch, row) => TCI_WORDS.done(ch, row?.state === 'running'),
};
