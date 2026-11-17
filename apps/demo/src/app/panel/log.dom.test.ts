// @vitest-environment happy-dom
// The Log sheet says what happened: where each case begins (the "Patient restarted" line in the case it begins), a rate
// change made on the instructor's own drug sheet as a change in a remote's words (the host writes the rate it replaced
// on every applied command), and a log kept from before either still opens.
import { ControllerSession, createInProcessHub, createStamper, HostSession, type CaseBegins, type HostTarget, type ManagedTransport, type WireEvent } from '@pme/controller';
import type { Command, DispatchResult } from '@pme/engine-core';
import { afterEach, describe, expect, it } from 'vitest';
import { Link, logCsv, type ClinicalLogEntry } from '../link.ts';
import { RunRecord } from '../record.ts';
import type { AppSession } from '../session.ts';
import type { PanelCtx } from './ctx.ts';
import { logTab } from './log.ts';

const S = 'LNK234';
/** Resolves at `link`'s next change: the event it was sent has reached it. */
const changed = (link: Link) => new Promise<void>((done) => {
  const off = link.onChange(() => (off(), done()));
});
const closers: Array<() => void> = [];
afterEach(() => closers.splice(0).forEach((c) => c()));

function appStub(): AppSession {
  const record = new RunRecord(() => ({ patient: '', weightKg: 70 }), () => 0, () => null, () => null);
  return { onMount: () => () => undefined, deviceLabel: (key: string, kind: 'learner' | 'pump' | 'defib') => record.label(key, kind), record: { note: () => undefined } } as unknown as AppSession;
}

/** The Log sheet over `link`, drawn as the panel draws it; `rows()` reads its lines, newest first. */
function sheet(link: Link) {
  let draw = () => undefined as void;
  const el = logTab({ link, onRefresh: (fn: () => void) => void (draw = fn) } as unknown as PanelCtx);
  document.body.replaceChildren(el);
  const rows = () => (draw(), [...el.querySelectorAll('ol.log li')].map((li) => `${li.hasAttribute('data-begins') ? '| ' : ''}${li.children[2]?.textContent ?? ''}`));
  const filter = (label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)?.click();
  return { rows, filter };
}

describe('the Log sheet marks where each case begins', () => {
  function wire() {
    const hub = createInProcessHub();
    const h = hub.connect();
    const t: ManagedTransport = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, appStub());
    closers.push(() => link.close());
    const stamp = createStamper(S, 'host-1');
    const send = async (e: WireEvent) => {
      const heard = changed(link);
      h.send(stamp({ kind: 'event', body: [e] }));
      await heard;
    };
    const begin = (begins: CaseBegins | undefined, cause: 'restart' | 'restore' = 'restart') => send({ type: 'timeline', t: 0, tick: 0, cause, ...(begins ? { begins } : {}) } as WireEvent);
    const give = (id: string) => send({ type: 'commandApplied', commandId: id, tick: 1500, resolved: { command: { id, type: 'applyEvent', event: { kind: 'drug', drugId: 'ephedrine', dose: 6, unit: 'mg', route: 'iv' }, issuedBy: 'learner', by: 'bed2remote01', sender: { role: 'learner', name: 'Learner remote 1' } } } } as unknown as WireEvent);
    return { link, begin, give };
  }

  it('one line with the title when a card is loaded or restarted, or a new patient starts; the restart line opens the case it restarts', async () => {
    const { link, begin, give } = wire();
    const s = sheet(link);
    await begin({ title: 'Malignant hyperthermia', card: true, again: false });
    await give('a1');
    await begin({ title: 'Malignant hyperthermia', card: true, again: true });
    expect(link.log.map((x) => x.text)).toEqual(['Case restarted from 0:00: Malignant hyperthermia']);
    await give('a2');
    await begin({ title: 'M 40 y 70 kg', card: false, again: false });
    await begin({ title: 'M 40 y 70 kg', card: false, again: true });
    await begin({ title: '[draft] Anaphylaxis', card: true, again: false });
    expect(s.rows()).toEqual([
      '| Case begins: Anaphylaxis',
      '| Patient restarted: M 40 y 70 kg',
      '| New patient: M 40 y 70 kg',
      'Ephedrine 6 mg IV (Learner remote 1)',
      '| Case restarted from 0:00: Malignant hyperthermia',
      'Ephedrine 6 mg IV (Learner remote 1)',
      '| Case begins: Malignant hyperthermia',
    ]);
    // a case brought back after the host's page reloaded, and a return to a bookmark, begin nothing
    await begin(undefined);
    await begin({ title: 'x', card: true, again: false }, 'restore');
    expect(s.rows()).toHaveLength(7);
    // the lines stay under every filter, and travel in the exports
    s.filter('Alarms');
    expect(s.rows().filter((r) => r.startsWith('| '))).toHaveLength(5);
    expect(logCsv(link.sessionLog).split('\n').filter((l) => /,system,(Case|New patient|Patient restarted)/.test(l))).toHaveLength(5);
  });

  it('a log kept from before (a reload of a case whose lines have no begin mark) still opens', async () => {
    const { link } = wire();
    const s = sheet(link);
    const kept: ClinicalLogEntry[] = [
      { simT: 10, kind: 'instructor', text: 'Propofol 3 mL/h infusion started' },
      { simT: 20, kind: 'system', text: 'Patient restarted: the case starts again from 0:00' },
    ];
    link.resumeCase(kept, 30);
    expect(s.rows()).toEqual(['Patient restarted: the case starts again from 0:00', 'Propofol 3 mL/h infusion started']);
  });
});

/** A target that accepts every command at the tick it is at. */
function target(): HostTarget {
  return {
    dispatch: (c: Command): DispatchResult => ({ accepted: true, tick: c.atTick ?? 100 }),
    snapshot: () => ({ schema: 'x', tick: 0 }) as never,
    restore: () => undefined,
    on: () => () => undefined,
    now: () => ({ tick: 100, simT: 2 }),
    time: () => undefined,
  };
}

describe("a rate change on the instructor's own drug sheet", () => {
  it('reads as a change, in the words a remote\'s change has; its first start reads as a start', async () => {
    const host = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    closers.push(() => host.close());
    const hub = createInProcessHub();
    host.addTransport(hub.connect());
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t, issuedBy: 'instructor' }), t, appStub());
    closers.push(() => link.close());
    const s = sheet(link);
    const rate = (r: number) => link.send({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: r, unit: 'mL/h' } } as never);
    // each line is final once the host's commandApplied for it is here: its rate replaced is what the host wrote
    const applied = (n: number) => new Promise<void>((done) => {
      let seen = 0;
      const off = t.onMessage((m) => {
        if (m.kind === 'event' && m.body.some((e) => e.type === 'commandApplied') && ++seen === n) (off(), done());
      });
    });
    const first = applied(1);
    expect((await rate(3)).accepted).toBe(true);
    await first;
    const second = applied(1);
    expect((await rate(6)).accepted).toBe(true);
    await second;
    expect(s.rows()).toEqual(['Norepinephrine infusion rate changed from 3 to 6 mL/h', 'Norepinephrine 3 mL/h infusion started']);
  });
});
