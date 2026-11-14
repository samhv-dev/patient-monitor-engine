// Brief 195: what a learner monitor says when the instructor's simulation has stopped (the host's `engineStopped`,
// once a second while it lasts) — the truth, not "not answering", while the host is there; "not answering" once it is not.
import { describe, expect, it } from 'vitest';
import { ENGINE_STOPPED, followerStatus, HOST_SILENT_MS, type FollowerInput } from './follower-status.ts';

const ok: FollowerInput = { code: 'AB2CD3', net: true, sync: 'synced', transport: 'open', opened: true, sinceStartMs: 60_000, refused: null, hostAway: false, heardAgoMs: 200, paused: false, cockpitAgoMs: Infinity };
const s = (p: Partial<FollowerInput>) => followerStatus({ ...ok, ...p });

describe('the learner monitor when the instructor’s simulation has stopped', () => {
  it('a host here whose simulation has stopped says so, whether or not this phone is synced, paused or not', () => {
    expect(s({ stopped: true })).toEqual({ text: ENGINE_STOPPED, ok: false, hold: false });
    expect(s({ stopped: true, sync: 'waiting' }).text).toBe(ENGINE_STOPPED); // joined after the stop: no snapshot can come
    expect(s({ stopped: true, paused: true }).text).toBe(ENGINE_STOPPED);
    expect(s({ stopped: true, cockpitAgoMs: 0 }).hold).toBe(false); // nothing to hold for: the patient has stopped
    expect(s({ stopped: true, net: false }).text).toBe(ENGINE_STOPPED); // the second screen too
  });
  it('a stopped host that then goes silent, or that the relay reports gone, is "not answering" (it says so every second)', () => {
    expect(s({ stopped: true, heardAgoMs: HOST_SILENT_MS }).text).toBe("The instructor's monitor is not answering");
    expect(s({ stopped: true, paused: true, heardAgoMs: HOST_SILENT_MS }).text).toBe("The instructor's monitor is not answering");
    expect(s({ stopped: true, hostAway: true }).text).toBe("The instructor's monitor is not answering");
    expect(s({ stopped: true, transport: 'connecting' }).text).toBe('Connection lost: reconnecting…');
  });
  it('without the notice nothing changes', () => {
    expect(s({ stopped: false })).toEqual(s({}));
    expect(s({}).text).toBe('Following session AB2CD3');
  });
});
