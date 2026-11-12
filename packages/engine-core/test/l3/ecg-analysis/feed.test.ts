// Defibrillator plan E4a (§3.4.3): the sample feed every signal analyser reads — a named lead after the monitor's
// front end (artefacts, lead-off, mains), committed samples only, its state in the pipeline state so it clones with the
// look-ahead, snapshots and replays on followers exactly. Plus the tests every engine piece carries (plan §6).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import { ecgFrontEnd } from '../../../src/l2/ecg/ecg-gen.ts';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';
import type { DeviceHost } from '../../../src/l3/device-layer.ts';
import { FEED_S } from '../../../src/l3/ecg-analysis/feed.ts';
import { measureSegment, SEGMENT_S } from '../../../src/l3/ecg-analysis/features.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../../src/types.ts';

let seq = 0;
const cmd = (body: Record<string, unknown>) => ({ id: `f${++seq}`, issuedBy: 'test', ...body }) as Command;
type Inner = { st: { n: number; mods: Parameters<typeof ecgFrontEnd>[0] }; mainsHz: 50 | 60; deviceHost(simT: number): DeviceHost };
const inner = (e: MonitorEngine) => e as unknown as Inner;
const host = (e: MonitorEngine) => inner(e).deviceHost(e.now().simT);
const feedOf = (e: MonitorEngine) => {
  const f = host(e).ecgFeed;
  if (!f) throw new Error('the host gives no ECG feed');
  return f;
};
const seg = (e: MonitorEngine) => Array.from(feedOf(e).segment() ?? []);

describe('the ECG feed', () => {
  it('names its lead (the detection lead, ecgII), its rate and the committed frontier; it holds one 3-s segment', () => {
    const e = createEngine({ seed: 5 });
    e.advanceTo(4);
    const f = feedOf(e);
    expect(f.lead).toBe('ecgII');
    expect(f.fs).toBe(500);
    expect(FEED_S).toBe(SEGMENT_S);
    expect(f.committedN).toBe(inner(e).st.n);
    expect(f.segment()?.length).toBe(SEGMENT_S * 500);
  });

  it('before 3 s are committed it holds no segment', () => {
    const e = createEngine({ seed: 5 });
    e.advanceTo(2);
    expect(feedOf(e).segment()).toBeNull();
  });

  it('is the lead after the front end: each sample equals the committed VCG projected on lead II through ecgFrontEnd, with artefacts and lead-off applied', () => {
    for (const mods of [{}, { artefact: { mains: 1, motion: 0.5, emg: 0.5 } }, { artefact: { leadOff: true } }]) {
      const e = createEngine({ seed: 9 });
      e.dispatch(cmd({ type: 'setModifiers', modifiers: mods }));
      e.advanceTo(5);
      const h = host(e);
      const s = h.ecgFeed?.segment() as Float64Array;
      const n0 = h.committedN - s.length;
      for (const k of [0, 1, 777, s.length - 1]) {
        const v = h.vcgAt(n0 + k) as [number, number, number];
        expect(s[k]).toBe(ecgFrontEnd(inner(e).st.mods, inner(e).mainsHz, 'ecgII', n0 + k, projectLead('ecgII', ...v)));
      }
    }
  });

  it('holds committed samples only: a run that never looks ahead holds the same feed', () => {
    const a = createEngine({ seed: 3 });
    const b = createEngine({ seed: 3 });
    a.advanceTo(6);
    b.advanceTo(6, false);
    expect(seg(a)).toEqual(seg(b));
    expect(feedOf(a).committedN).toBe(feedOf(b).committedN);
  });

  it('carries no rhythm identity: the view has no rhythm field, and a host with its rhythm id removed measures the same', () => {
    const e = createEngine({ seed: 4 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.advanceTo(8);
    const h = host(e);
    const f = h.ecgFeed as NonNullable<DeviceHost['ecgFeed']>;
    expect(Object.keys(f).filter((k) => /rhythm|pulse/i.test(k))).toEqual([]);
    const stripped = { ...h } as Partial<DeviceHost>;
    delete stripped.rhythmId;
    delete stripped.pulseless;
    expect(measureSegment(stripped.ecgFeed?.segment() as Float64Array, 500)).toEqual(measureSegment(f.segment() as Float64Array, 500));
  });
});

describe('the tests every engine piece carries (plan §6)', () => {
  const course = (e: MonitorEngine, upTo: number) => {
    if (e.now().simT < 2) e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.advanceTo(Math.min(upTo, 6));
    if (upTo > 6) {
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } }));
      e.advanceTo(upTo);
    }
  };

  it('the snapshot round trip keeps the feed (through JSON), and the restored engine continues with the same samples', () => {
    const a = createEngine({ seed: 21 });
    course(a, 6);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 21 });
    b.restore(snap);
    expect(seg(b)).toEqual(seg(a));
    course(a, 10);
    course(b, 10);
    expect(seg(b)).toEqual(seg(a));
  });

  it('a snapshot without the feed (an older bookmark) restores with an empty feed that holds a segment again after 3 s', () => {
    const a = createEngine({ seed: 21 });
    a.advanceTo(5);
    const snap = a.snapshot();
    const st = (snap.state as { st: Record<string, unknown> }).st;
    delete st.feed;
    const b = createEngine({ seed: 21 });
    b.restore(snap);
    expect(feedOf(b).segment()).toBeNull();
    b.advanceTo(8.02);
    a.advanceTo(8.02);
    expect(seg(b)).toEqual(seg(a));
  });

  it('a follower that replays the commands holds the same feed and the same events', () => {
    const run = () => {
      const e = createEngine({ seed: 33 });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
      course(e, 12);
      return { s: seg(e), ev: JSON.stringify(ev) };
    };
    const a = run();
    const b = run();
    expect(b.s).toEqual(a.s);
    expect(b.ev).toBe(a.ev);
  });

  it('the feed is ECG machinery, not physiology: the truth tree does not carry it', () => {
    const e = createEngine({ seed: 8, truthHz: 1 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(2);
    const truth = ev.find((x) => x.type === 'truth') as { tree: Record<string, unknown> } | undefined;
    expect(truth).toBeDefined();
    expect(Object.keys(truth?.tree ?? {})).not.toContain('feed');
  });
});
