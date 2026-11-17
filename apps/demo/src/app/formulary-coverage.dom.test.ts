// @vitest-environment happy-dom
// Every drug a shipped case asks for, expects, grades or names to its team can be prepared on the learner remote and
// given through the host; every drug the pump tablet can be programmed with can be prepared there in a syringe and run
// by the host. The cards are read as the app shows them (the library's cards with their story and objectives); a drug
// counts when a card names its library id anywhere, or its name in any text the card shows. Provenance (`src`,
// `$comment`) and ids are not teaching text.
import type { Formulary, WireCommand } from '@pme/controller';
import { createEngine, DRUGS, type Command } from '@pme/engine-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { deliverPrep, infusePrep, stagePrep } from '../../../../packages/controller/src/session/preparations.ts';
import { loadShippedFormulary } from './formulary.ts';
import { DRUG_NAMES } from './glossary-data.ts';
import { pumpDrugs } from './pump/program.ts';
import { LIBRARY } from './scenarios.ts';

/** A drug the remote cannot prepare or the host cannot run yet, and why; the list may only shrink. */
const WANTED: Readonly<Record<string, string>> = {
  mivacurium: 'no openly readable label on DailyMed or EMC',
  potassiumChloride: 'the labels read name no diluent, and the host takes no syringe in mmol or mEq',
};

const NOT_TEACHING = new Set(['src', '$comment', 'id', 'drugId', 'schema']);
const injectable = Object.values(DRUGS).filter((r) => r.cls !== 'volatile').map((r) => r.id);

/** The words a drug is called by: the library's and the glossary's names and the UK name, each also without a
 *  parenthesis or a trailing strength ("Dextrose 50 %" is also "dextrose"). The search aliases are not names: "potassium"
 *  finds potassium chloride on the bench, but in a card it is the patient's potassium. */
function namesOf(id: string): string[] {
  const g = DRUG_NAMES[id];
  const raw = [DRUGS[id]!.name, g?.name, g?.uk].filter((x): x is string => !!x);
  const plain = raw.map((n) => n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/[\s\d.,%/+]+$/, '').trim());
  return [...new Set([...raw, ...plain].map((n) => n.toLowerCase()).filter((n) => n.length > 2))];
}
const PATTERNS = injectable.map((id) => [id, namesOf(id).map((n) => new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`, 'i'))] as const);
const named = (text: string): string[] => PATTERNS.filter(([, ps]) => ps.some((p) => p.test(text))).map(([id]) => id);

/** The drugs a card asks for: every library id it holds, and every drug named in the text it shows. */
function caseDrugs(card: (typeof LIBRARY)[number]): string[] {
  const out = new Set<string>();
  const visit = (v: unknown, key: string): void => {
    if (typeof v === 'string') {
      if ((key === 'drugId' || key === 'id') && v in DRUGS) out.add(v);
      else if (!NOT_TEACHING.has(key)) for (const id of named(v)) out.add(id);
    } else if (Array.isArray(v)) v.forEach((x) => visit(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, k);
  };
  visit(card.doc, '');
  for (const t of [card.title, card.story, ...card.objectives]) for (const id of named(t)) out.add(id);
  return [...out].filter((id) => DRUGS[id]!.cls !== 'volatile').sort();
}

let F: Formulary;
beforeAll(async () => {
  const f = await loadShippedFormulary();
  if (!f) throw new Error('the shipped formulary breaks its source rules');
  F = f;
});

type Stage = Extract<WireCommand, { type: 'prep'; action: 'stage' }>;
const stage = (drugId: string, container: 'syringe-pp' | 'vial') => {
  const p = F.drugs[drugId]!.products[0]!;
  const diluent = F.drugs[drugId]!.diluents.find((d) => d.listed && (!p.reconstitute || p.reconstitute.diluents.includes(d.id)));
  const prep = { id: `${drugId}0001`, components: [{ productId: p.id, amount: 1, unit: p.reconstitute ? 'vial' : 'mL' }], container, ...(p.reconstitute ? { diluent: { id: diluent!.id, volumeMl: 0 } } : {}) };
  return stagePrep(F, { id: 's1', issuedBy: 'learner', type: 'prep', action: 'stage', prep } as unknown as Stage, 'remote1', 'peer1', 0);
};
const BASE = { id: 'c1', issuedBy: 'learner', by: 'remote1' } as unknown as WireCommand;
/** The host's commands for a give (or a syringe infusion) of `drugId`, dispatched into an engine: its refusal, or null. */
function runs(drugId: string, how: 'give' | 'infuse'): string | null {
  const s = stage(drugId, how === 'give' ? 'vial' : 'syringe-pp');
  if (!s.ok) return s.why;
  const t = 3600;
  const out = how === 'give'
    ? deliverPrep(F, s.prep, { id: 'c1', type: 'prep', action: 'deliver', prepId: s.prep.id, volumeMl: 'all', route: 'iv' } as Extract<WireCommand, { type: 'prep'; action: 'deliver' }>, BASE, t)
    : infusePrep(F, s.prep, { id: 'c1', type: 'prep', action: 'infuse', prepId: s.prep.id, rateMlH: 1 } as Extract<WireCommand, { type: 'prep'; action: 'infuse' }>, BASE, t, new Map());
  if (!out.ok) return out.why;
  const e = createEngine({ seed: 1, mode: 'modeled' });
  for (const c of out.cmds) {
    const r = e.dispatch({ ...c, atTick: undefined } as unknown as Command);
    if (!r.accepted) return r.reason ?? 'refused by the engine';
  }
  return null;
}

describe('the drug names a card is read for', () => {
  it('find each injectable drug by its plain name in a sentence', () => {
    for (const id of injectable) expect(named(`Then give ${namesOf(id).at(-1)} now.`), id).toContain(id);
  });
  it('find amiodarone in the witnessed-VF card from its notes alone, and nothing from a citation', () => {
    const vf = LIBRARY.find((c) => c.id === 'acls-vf-witnessed')!;
    expect(caseDrugs({ ...vf, doc: { ...vf.doc, states: vf.doc.states.map((s) => ({ ...s, transitions: [] })) } })).toContain('amiodarone');
    expect(named('Rocuronium 1.2 mg/kg (Miller Ch40, p. 1237)')).toEqual(['rocuronium']);
    expect(caseDrugs({ ...vf, doc: { ...vf.doc, $comment: 'cites vecuronium', states: [] }, story: '', objectives: [] })).not.toContain('vecuronium');
  });
});

describe('every shipped case can be given its drugs from the remote', () => {
  it.each(LIBRARY.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    const missing = caseDrugs(card).filter((id) => !F.drugs[id]);
    expect(missing, `prepared on the remote: no formulary file (${missing.map((m) => WANTED[m] ?? 'pending').join('; ')})`).toEqual([]);
    for (const id of caseDrugs(card)) expect(runs(id, 'give'), `${id} given from a preparation`).toBeNull();
  });
});

describe('every drug the pump can be programmed with can be prepared on the remote and run', () => {
  it.each(pumpDrugs().map(([id]) => [id] as const))('%s', (id) => {
    const why = F.drugs[id] ? runs(id, 'infuse') : 'no formulary file';
    if (id in WANTED) expect(why, `${id} is WANTED (${WANTED[id]}) and must leave the list once it runs`).not.toBeNull();
    else expect(why, `${id} run by the pump from a syringe prepared on the remote`).toBeNull();
  });
  it('wants only pump or case drugs, each still pending', () => {
    for (const id of Object.keys(WANTED)) expect(F.pending, id).toContain(id);
  });
});
