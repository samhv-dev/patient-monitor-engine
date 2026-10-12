// Stage 10 Task 5 (the owner's fast-forward): the clinical log says where a fast-forward began and ended and lists the
// alarms raised during it, with their times (they were shown, not sounded); the log line of the command reads in words.
import { ControllerSession, createInProcessHub, createStamper } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { describeCommand, spanText } from './describe.ts';
import { Link } from './link.ts';

const S = 'FFL234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const al = (id: string, text: string, since: number, ended: boolean) => ({ id, text, since, ended, level: 2, category: 'physiological', acked: false, latched: false });

describe('Stage 10: the fast-forward in the clinical log', () => {
  it('logs the start and the end with the alarms raised during it and their times', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    const stamp = createStamper(S, 'host-1');
    const send = (body: unknown[]) => host.send(stamp({ kind: 'event', body: body as never }));
    send([{ type: 'fastForward', t: 60, tick: 3000, phase: 'start', fromT: 60, toT: 360, wallMs: 10_000 }]);
    send([{ type: 'fastForward', t: 360, tick: 18000, phase: 'end', fromT: 60, toT: 360, alarms: [al('spo2Low', 'SpO2 LOW', 100, true), al('hrHigh', 'HR HIGH', 200, false)] }]);
    await tick();
    const sys = link.log.filter((e) => e.kind === 'system');
    expect(sys.map((e) => [e.simT, e.text])).toEqual([
      [60, 'Fast-forward 5 min started (sound muted until it ends)'],
      [360, 'Fast-forward ended; alarms during it: SpO2 LOW 01:40, HR HIGH 03:20'],
    ]);
    expect(link.ctl.lastFastForward?.alarms.map((a) => a.id)).toEqual(['spo2Low', 'hrHigh']);
    link.close();
  });

  it('an early end says why; none raised says so', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    const stamp = createStamper(S, 'host-1');
    host.send(stamp({ kind: 'event', body: [{ type: 'fastForward', t: 10, tick: 500, phase: 'start', fromT: 10, toT: 130 }, { type: 'fastForward', t: 40, tick: 2000, phase: 'end', fromT: 10, toT: 130, stopped: 'a new patient or scenario started', alarms: [] }] as never }));
    await tick();
    expect(link.log.map((e) => e.text)).toEqual(['Fast-forward 2 min started (sound muted until it ends)', 'Fast-forward ended early (a new patient or scenario started); no alarms during it']);
    link.close();
  });

  it('the command reads in words', () => {
    expect(describeCommand({ type: 'time', action: 'jump', value: 300 })).toBe('Fast-forward 5 min');
    expect(describeCommand({ type: 'time', action: 'jump', value: 120 })).toBe('Fast-forward 2 min');
    expect(spanText(90)).toBe('90 s');
  });

  it('a span computed from two sim times reads in minutes despite floating point (gate dry run: "FAST FORWARD · 120 S")', () => {
    // the panel, the banner and the log compute the span as toT − fromT; 604.3 − 484.3 = 119.99999999999994 in IEEE doubles
    expect(spanText(604.3 - 484.3)).toBe('2 min');
    for (const tick of [22_305, 24_215, 32_845, 64_895]) {
      const fromT = tick * 0.02;
      expect(spanText(fromT + 300 - fromT)).toBe('5 min');
      expect(spanText(fromT + 120 - fromT)).toBe('2 min');
    }
  });
});
