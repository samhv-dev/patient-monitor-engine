// Learner remote L14 (the owner's ruling on N117: a dose from a learner's device is refused while the case is paused, the
// reason shown): on the host, the refused attempt is a Log line and a record row that say who tried to give what and
// that it was not given because the case was paused; the Debrief counts it as no dose (no drug total, no `drug:` run
// event, no give of a preparation). The host's refusal itself is packages/controller/test/session/host-learner-paused.test.ts.
import { ControllerSession, createInProcessHub, PAUSED_REFUSAL, type ManagedTransport, type NotGiven, type WireCommand } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { drugTotals, first, preparationsOf } from './debrief.ts';
import { Link } from './link.ts';
import { RunRecord } from './record.ts';
import type { AppSession } from './session.ts';

const KEY = 'bed2remote01';
const NAMES: Record<string, string> = { [KEY]: 'bed 2 remote' };
const names = (k: string) => NAMES[k] ?? null;
/** What the host hands its screens when it refuses a learner's give (host-session.ts onNotGiven), as it built it. */
const fentanyl: NotGiven = {
  command: { id: 'lr-7', issuedBy: 'learner', by: KEY, prepId: 'f0000001', type: 'applyEvent', event: { kind: 'drug', drugId: 'fentanyl', dose: 50, unit: 'mcg', route: 'iv' } } as unknown as WireCommand,
  from: 'lr.1', reason: PAUSED_REFUSAL, t: 75,
};

const abg: NotGiven = {
  command: { id: 'lr-8', issuedBy: 'learner', by: KEY, type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } } as unknown as WireCommand,
  from: 'lr.1', reason: PAUSED_REFUSAL, t: 80,
};

describe('L14: a learner give refused while paused, on the host', () => {
  it("the record keeps the attempt as a learner row naming the phone, the drug and dose, and 'not given: the case was paused'", () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names);
    r.notGiven(fentanyl);
    expect(r.data.rows).toEqual([{ t: 75, kind: 'learner', text: 'Fentanyl 50 µg IV not given: the case was paused', remote: true, by: KEY, name: 'bed 2 remote', notGiven: PAUSED_REFUSAL }]);
  });

  it('the Debrief counts it as no dose: no drug total, no drug run event, no give of a preparation', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names);
    r.notGiven(fentanyl);
    expect(drugTotals(r.data)).toEqual([]);
    expect(first(r.data, 'drug:fentanyl')).toBeNull();
    expect(preparationsOf(r.data, names, null)).toBeNull(); // no "a remote gave from a preparation the run kept no record of"
  });

  it("the host's Log has the line, with the phone's Room-setup name and the reason", () => {
    const hub = createInProcessHub();
    const t: ManagedTransport = hub.connect();
    const record = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names);
    const host = { onMount: () => () => undefined, deviceLabel: (k: string, kind: 'learner') => record.label(k, kind), record: { note: () => undefined } } as unknown as AppSession;
    const link = new Link(new ControllerSession({ session: 'LNK234', transport: t }), t, host);
    link.notGiven(fentanyl);
    expect(link.log).toEqual([{ simT: 75, kind: 'learner', text: 'Fentanyl 50 µg IV (bed 2 remote) not given: the case was paused' }]);
    link.close();
  });

  it("a sample refused while paused: the record and the Log say it was not drawn, with the phone and the reason", () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names);
    r.notGiven(abg);
    expect(r.data.rows).toEqual([{ t: 80, kind: 'learner', text: 'Arterial blood gas not drawn: the case was paused', remote: true, by: KEY, name: 'bed 2 remote', notGiven: PAUSED_REFUSAL }]);
    const hub = createInProcessHub();
    const t: ManagedTransport = hub.connect();
    const host = { onMount: () => () => undefined, deviceLabel: (k: string, kind: 'learner') => r.label(k, kind), record: { note: () => undefined } } as unknown as AppSession;
    const link = new Link(new ControllerSession({ session: 'LNK234', transport: t }), t, host);
    link.notGiven(abg);
    expect(link.log).toEqual([{ simT: 80, kind: 'learner', text: 'Arterial blood gas (bed 2 remote) not drawn: the case was paused' }]);
    link.close();
  });
});
