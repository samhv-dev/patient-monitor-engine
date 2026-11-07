// FX-22 (classroom; #95 review F2): a phone's "(paused)" stayed after the instructor reloaded a paused session. The phone
// kept the last `time pause` it had seen; the reloaded page runs (or pauses again) from ITS own state, and a running page
// never sends a resume, so nothing cleared the label. The phone now takes the pause from what the host says it is when
// it (re)welcomes the phone: a welcome (the sticky replays, then the snapshot) without a replayed pause is a running host.
import type { WireEvent, WireMessage } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { hostPause } from './follower-status.ts';

let seq = 0;
const msg = (body: Record<string, unknown>): WireMessage => ({ session: 'KKQB2N', from: 'host-1', seq: ++seq, at: 0, ...body }) as unknown as WireMessage;
const time = (action: 'pause' | 'resume', replay = false): WireEvent => ({ type: 'commandApplied', commandId: `c${++seq}`, tick: 0, resolved: { command: { id: 'x', issuedBy: 'instructor', type: 'time', action }, ...(replay ? { replay: true } : {}) } }) as WireEvent;
const events = (...body: WireEvent[]) => msg({ kind: 'event', body });
const hello = () => msg({ kind: 'hello', role: 'host' });
const snapshot = () => msg({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } });

describe("FX-22: the phone's pause follows the host's own state", () => {
  it('a live pause and resume set and clear it', () => {
    const p = hostPause();
    p.onMessage(events(time('pause')));
    expect(p.paused).toBe(true);
    p.onMessage(events(time('resume')));
    expect(p.paused).toBe(false);
  });

  it('the instructor reloads a paused session that comes back running: the label clears', () => {
    const p = hostPause();
    p.onMessage(events(time('pause')));
    expect(p.paused).toBe(true);
    // the reloaded page: its hello, then its welcome — no pause among the replays (it runs), then its snapshot
    p.onMessage(hello());
    p.onMessage(events({ type: 'style', skin: 'saadat-like', theme: '', replay: true } as unknown as WireEvent));
    p.onMessage(snapshot());
    expect(p.paused).toBe(false);
  });

  it('a host that comes back paused (a reload restores the pause) keeps the label, without a gap', () => {
    const p = hostPause();
    p.onMessage(events(time('pause')));
    p.onMessage(hello());
    expect(p.paused).toBe(true); // nothing said yet: the label stays until the host says what it is
    p.onMessage(events(time('pause', true)));
    p.onMessage(snapshot());
    expect(p.paused).toBe(true);
  });

  it("another phone's welcome says the same state: a running host stays running", () => {
    const p = hostPause();
    p.onMessage(events(time('resume', true)));
    p.onMessage(snapshot());
    expect(p.paused).toBe(false);
  });
});
