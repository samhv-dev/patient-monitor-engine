// What a scenario card shows before a case is loaded (research/13 §4.3; TrainingMonitor's categorised catalogue; CAE and
// REALITi objectives checklists). `pme-scenario/1` carries the title, the notes and the patient; the category, the
// learner-facing story, the expected duration and the objectives live here until the schema gains them (request to
// 8b/v1.1). The document notes are written for authors (they name build stages); cards show `story` instead.
// Every built-in is a draft until Ali's clinical review.
export type Category = 'Showcase' | 'Resuscitation' | 'Haemodynamic crisis' | 'Anaesthesia depth and drugs' | 'Airway and breathing' | 'Metabolic and thermal';
export const CATEGORIES: readonly Category[] = ['Showcase', 'Resuscitation', 'Haemodynamic crisis', 'Anaesthesia depth and drugs', 'Airway and breathing', 'Metabolic and thermal'];

export interface ScenarioMeta {
  category: Category;
  minutes: number;
  story: string;
  objectives: string[];
  /** Show the learner controls under the monitor when this scenario loads (orchestrator ruling 4). Default off; no
   *  built-in case turns them on yet — the instructor switches them on per run in the Scenario tab. */
  learnerControls?: boolean;
}

export const SCENARIO_META: Readonly<Record<string, ScenarioMeta>> = {
  'acls-vf-witnessed': {
    category: 'Resuscitation', minutes: 10,
    story: 'A 58-year-old man in recovery after a laparoscopic cholecystectomy stops responding. The monitor shows VF.',
    objectives: ['Recognise VF within 10 s of the rhythm change', 'Shock within 2 min of the arrest', 'Keep chest-compression pauses under 10 s', 'Give adrenaline after the second shock'],
  },
  'acls-pea-hypovolaemia': {
    category: 'Resuscitation', minutes: 12,
    story: 'A 34-year-old woman with a splenic injury becomes more tachycardic on the ward, then loses her pulse.',
    objectives: ['Recognise PEA: organised rhythm, no pulse', 'Start CPR without delay', 'Name hypovolaemia as the cause', 'Give volume and adrenaline'],
  },
  'acls-bradycardia-unstable': {
    category: 'Resuscitation', minutes: 10,
    story: 'A 72-year-old woman is dizzy and grey in the emergency department. Complete heart block, escape rate 32/min.',
    objectives: ['Recognise complete heart block with adverse features', 'Give atropine, then pace or start an adrenaline infusion', 'Confirm electrical and mechanical capture'],
  },
  'svt-adenosine': {
    category: 'Haemodynamic crisis', minutes: 8,
    story: 'A 26-year-old woman has palpitations. She is stable, with a regular narrow-complex tachycardia at 180/min.',
    objectives: ['Recognise a regular narrow-complex tachycardia', 'Try vagal manoeuvres first', 'Give adenosine 6 mg, then 12 mg, as a rapid push with a flush'],
  },
  'or-induction-hypotension': {
    category: 'Haemodynamic crisis', minutes: 10,
    story: 'A 67-year-old man on an ACE inhibitor becomes hypotensive after a propofol induction for a hernia repair.',
    objectives: ['Anticipate hypotension after induction in a treated hypertensive', 'Choose phenylephrine or ephedrine by heart rate', 'Recheck the blood pressure within 2 min'],
  },
  'depth-awareness': {
    category: 'Anaesthesia depth and drugs', minutes: 10,
    story: 'The propofol line comes apart unnoticed after induction and rocuronium. The patient is paralysed and lightening.',
    objectives: ['Notice the rising depth index, tachycardia and hypertension', 'Find the disconnected line', 'Give a propofol bolus and restart the infusion'],
  },
  'depth-light-anaesthesia': {
    category: 'Anaesthesia depth and drugs', minutes: 8,
    story: 'Sevoflurane at 0.6 MAC with no opioid or relaxant. The surgeon makes the skin incision.',
    objectives: ['Recognise the stress response to incision', 'Deepen to about 1.2 MAC', 'Give fentanyl 1–2 µg/kg'],
  },
  'depth-opioid-apnoea': {
    category: 'Airway and breathing', minutes: 8,
    story: 'Fentanyl 3 µg/kg is given for analgesia just before emergence from a remifentanil anaesthetic.',
    objectives: ['Recognise opioid-induced slow breathing, then apnoea', 'Support ventilation', 'Titrate naloxone'],
  },
  'nmb-mh-trigger': {
    category: 'Metabolic and thermal', minutes: 12,
    story: 'Succinylcholine for intubation and sevoflurane maintenance in a patient with an undisclosed family history.',
    objectives: ['Recognise a rising EtCO₂ despite ventilation, tachycardia and rigidity', 'Stop the volatile and hyperventilate with 100 % oxygen', 'Give dantrolene 2.5 mg/kg'],
  },
  'nmb-residual-block': {
    category: 'Airway and breathing', minutes: 10,
    story: 'Extubated 35 min after rocuronium 0.6 mg/kg with no reversal. Breathing is weak and obstructed.',
    objectives: ['Check the train-of-four before extubation', 'Recognise residual block', 'Give sugammadex and support the airway'],
  },
  'nmb-sux-burn': {
    category: 'Metabolic and thermal', minutes: 10,
    story: 'Rapid-sequence induction with succinylcholine 1.5 mg/kg for a dressing change, 10 days after a 40 % burn.',
    objectives: ['Recognise hyperkalaemia on the ECG', 'Treat it: calcium, insulin and dextrose', 'Name the error: no succinylcholine after the first 24–48 h of a burn'],
  },
};

/** Card fallback for a document without meta: its notes without author references (stage and ruling numbers). */
export function storyOf(id: string, notes: string | undefined): string {
  const m = SCENARIO_META[id];
  if (m) return m.story;
  const s = (notes ?? '').replace(/\s*\((?:Stage\s*)?\d[a-z]?[^)]*\)|\s*\bR\d+(?:\s*§\s*\d+)?/g, '');
  const first = /^[^.]*\./.exec(s)?.[0] ?? s;
  return first.trim();
}

export const draft = (title: string): { title: string; draft: boolean } => {
  const m = /^\[draft\]\s*/i.exec(title);
  return m ? { title: title.slice(m[0].length), draft: true } : { title, draft: false };
};
