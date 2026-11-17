// @vitest-environment happy-dom
// The instructor's per-case readings of the log belong to the case that runs: a new body (a 'restart' timeline: a card
// loaded, "Save and restart", "Save and close") starts a case as it starts the Debrief's record. The board's "Off the
// card" and its judged objectives read only the running case's lines; the Log sheet keeps the session; the finished
// case's record, the one its debrief was saved from, keeps its own rows.
import { ControllerSession, createInProcessHub, createStamper, type ScenarioDoc, type WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { drugWords } from './glossary.ts';
import { Link } from './link.ts';
import { RunRecord } from './record.ts';
import type { AppSession } from './session.ts';
import { showcaseDoc } from './showcase/harness.ts';
import { boardOf } from './teach2/feed.ts';

const S = 'LNK234';
const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const tick = () => new Promise((r) => setTimeout(r, 0));
const ephedrine = { type: 'applyEvent', event: { kind: 'drug', drugId: 'ephedrine', dose: 50, unit: 'mg', route: 'iv' } };
/** MH's early-signs stage, which carries a judged objective row. */
const EARLY = [
  { t: 0, stateId: 'awake' },
  { t: 10, stateId: 'premedicated', transitionId: 'premed-air' },
  { t: 20, stateId: 'induced', transitionId: 'induce' },
  { t: 30, stateId: 'intubated', transitionId: 'intubate' },
  { t: 40, stateId: 'surgery', transitionId: 'surgery' },
  { t: 50, stateId: 'earlySigns', transitionId: 'signs' },
];

/** The host's panel Link and the session's record on one transport, as session.ts wires them. */
function host() {
  const hub = createInProcessHub();
  const h = hub.connect();
  const t = hub.connect();
  const record = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }));
  t.onMessage((m) => void (m.kind === 'event' && m.body.forEach((e) => record.wire(e))));
  const app = { onMount: () => () => undefined, deviceLabel: (k: string, kind: 'learner' | 'pump' | 'defib') => record.label(k, kind), record, driver: { vitalHolds: () => [], phaseRunner: null } } as unknown as AppSession;
  const link = new Link(new ControllerSession({ session: S, transport: t }), t, app);
  const stamp = createStamper(S, 'host-1');
  const send = async (e: WireEvent) => (h.send(stamp({ kind: 'event', body: [e] })), await tick());
  /** A card loaded: a new engine (its timeline), then the card's stage as the view reads it. */
  const load = async () => {
    await send({ type: 'timeline', t: 0, tick: 0, cause: 'restart' } as WireEvent);
    const sv = link.ctl.scenario;
    Object.assign(sv, { doc: MH, docVersion: sv.docVersion + 1, stateId: 'earlySigns', history: [...EARLY], enteredT: 50 });
    record.data.doc = MH;
  };
  let n = 0;
  const learnerGive = () => send({ type: 'commandApplied', commandId: `other-${++n}`, tick: 3000, resolved: { command: { id: `other-${n}`, ...ephedrine, issuedBy: 'learner', by: 'bed2remote01' } } } as unknown as WireEvent);
  return { link, record, send, load, learnerGive };
}

const judged = (link: Link) => (boardOf(link)?.finished ?? []).filter((r) => r.row.kind === 'judged').map((r) => r.look);

describe('the running case owns the board\'s readings of the log', () => {
  it('a learner\'s act and a judged objective of one case are not on the next case\'s board; that case\'s record keeps them', async () => {
    const { link, record, load, learnerGive } = host();
    await load();
    await learnerGive();
    const objective = (MH.objectives?.[0] as { text: string }).text;
    link.note(`Objective met: ${drugWords(objective)}`, 'marker');
    expect(boardOf(link)?.offCard.map((x) => x.text)).toEqual(['Ephedrine 50 mg IV (Learner remote 1)']);
    expect(judged(link)).toEqual(['met']);
    const saved = record.data; // what "Finish the case" archives
    const kept = structuredClone(saved);
    expect(saved.rows.filter((r) => r.kind === 'learner').map((r) => r.text)).toEqual(['Ephedrine 50 mg IV']);

    await load(); // the next case ("Save and restart the case")
    expect(boardOf(link)?.offCard).toEqual([]);
    expect(judged(link)).toEqual([]);
    expect(record.data).not.toBe(saved);
    expect(saved).toEqual(kept);
    // the Log sheet keeps the session
    expect(link.sessionLog.map((x) => x.text)).toContain('Ephedrine 50 mg IV (Learner remote 1)');

    await learnerGive();
    expect(boardOf(link)?.offCard.map((x) => x.text)).toEqual(['Ephedrine 50 mg IV (Learner remote 1)']);
    link.close();
  });

  it('a return to a bookmark (a \'restore\' timeline) stays in the case', async () => {
    const { link, send, load, learnerGive } = host();
    await load();
    await learnerGive();
    await send({ type: 'timeline', t: 55, tick: 2750, cause: 'restore' } as WireEvent);
    expect(boardOf(link)?.offCard.map((x) => x.text)).toEqual(['Ephedrine 50 mg IV (Learner remote 1)']);
    link.close();
  });
});
