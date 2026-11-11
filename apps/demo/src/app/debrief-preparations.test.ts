// @vitest-environment happy-dom
// Plan learner-action-remote.md L13 ("Tests first"): the Debrief tells the learner remotes' story from the record alone.
// 1. The who line of a learner give and of an infusion change ("…, replacing the instructor's 4 mL/h"), named by the one
//    name source (AppSession.deviceName, PR 423), else numbered among the remotes. 2. The record keeps the /2 runner's
//    staged preparations, so one never given is in the Debrief too. 3. The Preparations section's rows from a scripted
//    run: what was prepared (the HOST's figures), when it was ready (the formulary's sourced time, or its LQ7 words), each
//    finding with its statement and sources (the formulary's, as the instructor's card names them), whether the
//    incompatibility notice was shown and when, each give before or after it with the active and the prepared amount and
//    what r rested on (the formulary's note: "loss not modelled", LQ8), the formulary's grade. 4. Nothing for a run with
//    no learner remote. The scripted figures are the shipped formulary's sodium bicarbonate 8.4 % 10 mL + epinephrine
//    1 mg/mL 1 mL (Stabilis: NaHCO3 as solvent degrades epinephrine) and the L2 fixture's powder [ENG: test].
import { GAP_WORDS, LEARNER_ISSUED_BY, type Administration, type Formulary, type PrepRecord, type StagedPrep, type WireEvent } from '@pme/controller';
import { beforeAll, describe, expect, it } from 'vitest';
import { learnerWho, preparationsOf, type PrepRow } from './debrief.ts';
import { loadShippedFormulary } from './formulary.ts';
import { drugName } from './glossary.ts';
import { sourceText } from './remote/bench.ts';
import { sourcesText } from './teach2/learner-preps.ts';
import { emptyRun, RunRecord, type GradeInputs, type Row, type RunData } from './record.ts';
import mhV2 from './showcase/showcase-mh-v2.json';

let F: Formulary;
beforeAll(async () => {
  F = (await loadShippedFormulary()) as Formulary;
});
const KEY = 'bed2remote01';
const KEY3 = 'bed3remote01';
const names = (m: Record<string, string>) => (k: string) => m[k] ?? null;
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: LEARNER_ISSUED_BY, ...command } } }) as WireEvent;

describe('L13: the who line of a learner remote', () => {
  it('a give: "<what> at 04:12, by Learner remote (bed 2)", the name read now through the one name source', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
    r.wire(applied(12_600, { by: KEY, prepId: 'p0000001', type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 175, unit: 'mg', route: 'iv' } }));
    const row = r.data.rows[0] as Row;
    expect(learnerWho(r.data.rows, row, names({ [KEY]: 'bed 2' }))).toBe(`${row.text} at 04:12, by Learner remote (bed 2)`);
  });
  it("an infusion change says whose rate it replaced: the instructor's (laptop or phone), the card's, another remote's", () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
    const inf = (tick: number, rate: number, by: string) => r.wire(applied(tick, { by: KEY3, type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate, unit: 'mL/h' }, replaced: { rate: rate / 2, rateUnit: 'mL/h', by } }));
    inf(19_500, 8, 'laptop');
    inf(20_000, 10, 'phone');
    inf(21_000, 12, 'card');
    inf(22_000, 14, KEY);
    const n = names({ [KEY3]: 'bed 3', [KEY]: 'bed 2' });
    const [a, b, c, d] = r.data.rows as [Row, Row, Row, Row];
    expect(learnerWho(r.data.rows, a, n)).toBe(`${a.text} at 06:30, by Learner remote (bed 3), replacing the instructor's 4 mL/h`);
    expect(learnerWho(r.data.rows, b, n)).toBe(`${b.text} at 06:40, by Learner remote (bed 3), replacing the instructor's 5 mL/h`);
    expect(learnerWho(r.data.rows, c, n)).toBe(`${c.text} at 07:00, by Learner remote (bed 3), replacing the card's 6 mL/h`);
    expect(learnerWho(r.data.rows, d, n)).toBe(`${d.text} at 07:20, by Learner remote (bed 3), replacing Learner remote (bed 2)'s 7 mL/h`);
    expect(learnerWho(r.data.rows, d, names({}))).toMatch(/, by Learner remote 1, replacing Learner remote 2's 7 mL\/h$/);
  });
});

describe("L13: the record keeps the /2 runner's staged preparations", () => {
  it('copied with the grade inputs, so a preparation never given is in the Debrief', () => {
    const staged: StagedPrep = { id: 'p0000009', by: KEY, t: 30, drugId: 'benchpowder', productId: 'fixture-powder-vial', concentration: { amount: 20, unit: 'mg', perMl: 2 }, volumeMl: 10, findings: [], notice: null };
    const runner: GradeInputs = { phases: [], admin: [], edges: [], preps: [staged] };
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => runner);
    r.wire({ type: 'commandApplied', commandId: 'load', tick: 0, resolved: { command: { id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: mhV2 } } } as WireEvent);
    r.wire({ type: 'scenario', t: 0, stateId: (mhV2 as { phases: Array<{ id: string }> }).phases[0]!.id } as WireEvent); // a phase entered: the copy
    expect(r.data.format).toBe(2);
    expect(r.data.preps).toEqual([staged]);
    expect(r.data.preps?.[0]).not.toBe(staged); // a copy: the runner's own changes later
  });
});

// ---- a scripted /2 run: two preparations of bed 2's remote, one of bed 3's -------------------------------------------
const MIX_FINDINGS = () => {
  const sb = F.drugs.sodiumBicarbonate!.admixtures.find((a) => a.with === 'epinephrine')!;
  const ep = F.drugs.epinephrine!.admixtures.find((a) => a.with === 'sodiumBicarbonate')!;
  return [
    { kind: 'incompatible' as const, drugId: 'sodiumBicarbonate', against: 'admixture' as const, other: 'epinephrine', statement: sb.statement, src: sb.src },
    { kind: 'incompatible' as const, drugId: 'epinephrine', against: 'admixture' as const, other: 'sodiumBicarbonate', statement: ep.statement, src: ep.src },
  ];
};
const MIX_ACTIVES = [{ drugId: 'sodiumBicarbonate', amount: 10, unit: 'mmol', perMl: 10 / 11 }, { drugId: 'epinephrine', amount: 1, unit: 'mg', perMl: 1 / 11 }];
function mix(notice: PrepRecord['notice']): StagedPrep {
  return { id: 'm0000001', by: KEY, t: 40, drugId: 'sodiumBicarbonate', productId: 'sodium-bicarbonate-84mg-ml', concentration: { amount: 10, unit: 'mmol', perMl: 10 / 11 }, volumeMl: 11, findings: MIX_FINDINGS(), notice, actives: MIX_ACTIVES, ready: { atS: 40, gap: 'LQ7', src: [] } };
}
const NOT_MODELLED = { src: null, beyondData: false, note: 'loss not modelled' as const };
function give(seq: number, t: number, a: (typeof MIX_ACTIVES)[number], notice: PrepRecord['notice']): Administration {
  const dose = 2 * a.perMl;
  return {
    seq, t, source: 'learner', by: KEY, kind: 'drug', drugId: a.drugId, dose, unit: a.unit, route: 'iv', result: { accepted: true },
    prep: { ...mix(notice), drugId: a.drugId, concentration: { amount: a.amount, unit: a.unit, perMl: a.perMl }, remaining: 1, activeAmount: dose, unit: a.unit, basis: NOT_MODELLED },
  };
}
const POWDER: StagedPrep = { id: 'p0000002', by: KEY, t: 100, drugId: 'dantrolene', productId: 'agilus-120mg', concentration: { amount: 120, unit: 'mg', perMl: 120 / 22.6 }, volumeMl: 22.6, findings: [], notice: null, actives: [{ drugId: 'dantrolene', amount: 120, unit: 'mg', perMl: 120 / 22.6 }], diluent: 'water', ready: { atS: 150, gap: null, src: ['emc-15912'] } };
const POWDER_GIVE: Administration = {
  seq: 3, t: 160, source: 'learner', by: KEY, kind: 'drug', drugId: 'dantrolene', dose: 120 * 0.75, unit: 'mg', route: 'iv', result: { accepted: true },
  prep: { ...POWDER, remaining: 0.75, activeAmount: 90, unit: 'mg', basis: { src: 'emc-15912', beyondData: true, note: null } },
};
const NEVER: StagedPrep = { id: 'q0000001', by: KEY3, t: 200, drugId: 'epinephrine', productId: 'adrenalin-1mg-ml', concentration: { amount: 1, unit: 'mg', perMl: 0.1 }, volumeMl: 10, diluent: 'water', findings: [{ kind: 'wrongDiluent', drugId: 'epinephrine', against: 'diluent', other: 'water', statement: null, src: null }], notice: null, actives: [{ drugId: 'epinephrine', amount: 1, unit: 'mg', perMl: 0.1 }], ready: { atS: 200, gap: 'LQ7', src: [] } };

function scripted(): RunData {
  const d = emptyRun('P', 70);
  d.doc = structuredClone(mhV2) as never;
  d.format = 2;
  d.phases = [{ id: (mhV2 as { phases: Array<{ id: string }> }).phases[0]!.id, t: 0, rule: 'initial' }];
  d.edges = [];
  // the mix given 2 mL at 01:00 BEFORE the notice; the notice shown at 01:30; a second 2 mL at 02:00 after it
  const [sb, ep] = MIX_ACTIVES as [(typeof MIX_ACTIVES)[number], (typeof MIX_ACTIVES)[number]];
  d.admin = [give(1, 60, sb, null), give(2, 60, ep, null), POWDER_GIVE, give(4, 120, sb, { shownAt: 90 }), give(5, 120, ep, { shownAt: 90 })];
  d.preps = [mix({ shownAt: 90 }), POWDER, NEVER];
  for (const a of d.admin) d.rows.push({ t: a.t, kind: 'learner', remote: true, by: a.by!, text: `${a.drugId} ${a.dose} ${a.unit} IV`, ev: `drug:${a.drugId}`, prepId: a.prep!.id, dose: { drugId: a.drugId!, dose: a.dose!, unit: a.unit! } });
  d.samples.push({ t: 300 } as never);
  return d;
}

/** The section's rows of a run, or [] (null: nothing to print). */
const rowsOf = (d: RunData, n: (k: string) => string | null, f: Formulary | null): PrepRow[] => preparationsOf(d, n, f)?.rows ?? [];
const src = (k: string) => sourceText(F.sources[k], k);
const water = () => F.diluents.water!.name;

describe('L13: the Preparations section, from a scripted /2 run', () => {
  it('one row per preparation in the order staged, each naming the remote that made it, in the HOST\'s figures', () => {
    const rows = rowsOf(scripted(), names({ [KEY]: 'bed 2' }), F);
    expect(rows.map((r) => [r.id, r.head])).toEqual([
      ['m0000001', `00:40 · Learner remote (bed 2) staged ${drugName('sodiumBicarbonate')} 10 mmol (0.909 mmol/mL) + ${drugName('epinephrine')} 1 mg (0.0909 mg/mL), 11 mL`],
      ['p0000002', `01:40 · Learner remote (bed 2) staged ${drugName('dantrolene')} 120 mg (5.31 mg/mL) in ${water()}, 22.6 mL`],
      ['q0000001', `03:20 · Learner remote 2 staged ${drugName('epinephrine')} 1 mg (0.1 mg/mL) in ${water()}, 10 mL`],
    ]);
  });

  it("the incompatible mix: the LQ7 words, each finding with the formulary's statement and sources, the notice's time, each give before or after it with the engine's dose, 'loss not modelled'", () => {
    const [m] = rowsOf(scripted(), names({ [KEY]: 'bed 2' }), F);
    expect(m!.ready).toBe(`Ready at once: ${GAP_WORDS.LQ7}`);
    expect(GAP_WORDS.LQ7).toBe('no source for the preparation time');
    const [sb, ep] = MIX_FINDINGS();
    expect(m!.findings).toEqual([
      { kind: 'incompatible', text: `Incompatible: ${sb!.statement} ${sourcesText(sb!, F)}` },
      { kind: 'incompatible', text: `Incompatible: ${ep!.statement} ${sourcesText(ep!, F)}` },
    ]);
    expect(m!.findings[0]!.text).toMatch(/^Incompatible: Stabilis \(epinephrine monograph\): NaHCO3 as solvent degrades epinephrine\. \(Stabilis .*; Trissel 2013 p\. 1859 agrees\)$/);
    expect(m!.notice).toBe('Notice shown at 01:30');
    const both = `${drugName('sodiumBicarbonate')} 1.82 mmol active of 1.82 mmol prepared (100 % intact; loss not modelled); ${drugName('epinephrine')} 0.182 mg active of 0.182 mg prepared (100 % intact; loss not modelled)`;
    expect(m!.gives).toEqual([`Given at 01:00, notice not shown: ${both}`, `Given at 02:00, after the notice: ${both}`]);
    expect(m!.grade).toBe('violation');
  });

  it("dantrolene in its listed water: ready at its sourced time with the label named; r from the source's figure, past its data; no finding, no notice line", () => {
    const [, p] = rowsOf(scripted(), names({}), F);
    expect(p!.ready).toBe(`Ready at 02:30 (${src('emc-15912')})`);
    expect(p!.findings).toEqual([]);
    expect(p!.notice).toBeNull();
    expect(p!.gives).toEqual([`Given at 02:40: ${drugName('dantrolene')} 90 mg active of 120 mg prepared (75 % intact; ${src('emc-15912')}, beyond the source's data)`]);
    expect(p!.grade).toBe('ok');
  });

  it('a wrong diluent never given: the finding with "no statement" and "no source speaks", "Notice not shown", "Not given", a deviation', () => {
    const [, , q] = rowsOf(scripted(), names({}), F);
    expect(q!.findings).toEqual([{ kind: 'wrongDiluent', text: 'Diluent not listed in the label: no statement in the formulary (no source speaks)' }]);
    expect(q!.notice).toBe('Notice not shown');
    expect(q!.gives).toEqual(['Not given']);
    expect(q!.grade).toBe('deviation');
  });

  it('without the formulary loaded (an archived run on a page that has not read it yet) the source keys stand for the sources', () => {
    const [m] = rowsOf(scripted(), names({}), null);
    expect(m!.findings[0]!.text).toBe(`Incompatible: ${MIX_FINDINGS()[0]!.statement} (stabilis-epinephrine-3642)`);
  });

  it('nothing for a run with no learner remote; a run whose remote gave from a preparation but kept no /2 record says so', () => {
    const plain = emptyRun('P', 70);
    plain.rows.push({ t: 10, kind: 'action', text: 'Fentanyl 100 µg IV', ev: 'drug:fentanyl' });
    expect(preparationsOf(plain, names({}), F)).toBeNull();
    const free = emptyRun('P', 70);
    free.rows.push({ t: 10, kind: 'learner', remote: true, by: KEY, text: 'Fentanyl 100 µg IV', ev: 'drug:fentanyl', prepId: 'f0000001' });
    expect(preparationsOf(free, names({}), F)).toEqual({ rows: [], unrecorded: true });
  });
});
