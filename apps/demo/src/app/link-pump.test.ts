// Plan pump-rack-tci.md A2 (§8, PQ8 = A): the host addresses its pump-mismatch finding (`pumpMismatch`, then
// `pumpMismatchCleared`) to its own id, as it does a preparation's news. Before A2 the Link read EVERY `prep` event to the
// host's id as a learner preparation's news (PrepBoard.apply reads `body.prep.by`), so the first mismatch threw in the
// Link's message handler and no card could show it. The Link now keeps the pump findings by channel for the
// instructor's card (teach2/pump-mismatch.ts) and the preparations' board as it was.
import { ControllerSession, createInProcessHub, createStamper, type ManagedTransport } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';
import type { AppSession } from './session.ts';

const S = 'LNK234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const hostStub = { onMount: () => () => undefined, deviceName: () => null, record: { note: () => undefined } } as unknown as AppSession;
const finding = { news: 'pumpMismatch', ch: 2, kind: 'syringe', device: 'pumptab0001', since: 300, notice: null, contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 } }, label: { amount: 50, unit: 'mcg', perMl: 1 }, origin: { stock: 'x' }, programmed: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } }, text: 'remifentanil 50 mcg/mL programmed as propofol 10 mg/mL' };

describe("the Link keeps the host's pump-mismatch findings (A2)", () => {
  it('a finding, its notice shown, then cleared: by channel, beside the preparations board, without a throw', async () => {
    const hub = createInProcessHub();
    const h = hub.connect();
    const t: ManagedTransport = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, hostStub);
    const stamp = createStamper(S, 'host-1');
    const prep = (body: unknown) => h.send(stamp({ kind: 'event', body: [{ type: 'prep', t: 300, to: 'host-1', body }] as never }));
    let changed = 0;
    link.onChange(() => void changed++);
    prep(finding);
    await tick();
    expect(link.pumpFindings.get(2)?.text).toBe('remifentanil 50 mcg/mL programmed as propofol 10 mg/mL');
    expect(link.preps.entries).toEqual([]);
    expect(changed).toBeGreaterThan(0);
    prep({ ...finding, notice: { shownAt: 330 } });
    await tick();
    expect(link.pumpFindings.get(2)?.notice).toEqual({ shownAt: 330 });
    prep({ news: 'pumpMismatchCleared', ch: 2 });
    await tick();
    expect(link.pumpFindings.size).toBe(0);
    // a learner preparation's news still reaches the board
    prep({ news: 'staged', prep: { by: 'bed2remote01', id: 'p1', findings: [], actives: [], container: 'syringe-pp', volumeMl: 5 } });
    await tick();
    expect(link.preps.entries.map((e) => e.prep.id)).toEqual(['p1']);
    link.close();
  });
});
