// The learner monitor's states (the follower reducer), phone and second screen.
import { describe, expect, it } from 'vitest';
import { COCKPIT_QUIET_MS, followerStatus, HOST_SILENT_MS, NO_PHONE_LAYOUT, phoneStyle, UNREACHABLE_MS, type FollowerInput } from './follower-status.ts';

const ok: FollowerInput = { code: 'AB2CD3', net: true, sync: 'synced', transport: 'open', opened: true, sinceStartMs: 60_000, refused: null, hostAway: false, heardAgoMs: 200, paused: false, cockpitAgoMs: Infinity };
const s = (p: Partial<FollowerInput>) => followerStatus({ ...ok, ...p });

describe('Stage 12: the learner monitor status (follower reducer)', () => {
  it('follows: the session, then "(paused)" while the host is paused — a paused host may be silent', () => {
    expect(s({})).toEqual({ text: 'Following session AB2CD3', ok: true, hold: false });
    expect(s({ paused: true, heardAgoMs: 60_000 })).toEqual({ text: 'Following session AB2CD3 (paused)', ok: true, hold: false });
  });
  it('a phone that never reached the relay waits quietly, then asks about the Wi-Fi', () => {
    expect(s({ opened: false, transport: 'connecting', sync: 'waiting', sinceStartMs: UNREACHABLE_MS - 1 }).text).toBe("Waiting for the instructor's monitor AB2CD3…");
    expect(s({ opened: false, transport: 'connecting', sync: 'waiting', sinceStartMs: UNREACHABLE_MS + 1 })).toMatchObject({ text: expect.stringMatching(/cannot reach the instructor's laptop\. Is it on the classroom Wi-Fi\?$/), ok: false });
  });
  it('a lost connection says it reconnects; a full session and another refusal say so (no retry)', () => {
    expect(s({ transport: 'connecting' }).text).toBe('Connection lost: reconnecting…');
    expect(s({ refused: { code: 'full', message: 'session AB2CD3 is full (60)' }, transport: 'error' }).text).toBe('This session is full: please watch the main screen');
    expect(s({ refused: { code: 'forbidden', message: "controller only from the instructor's computer" } }).text).toBe("The classroom refused this phone: controller only from the instructor's computer");
  });
  it('a silent running host, or one the relay reports gone, is "not answering"', () => {
    expect(s({ heardAgoMs: HOST_SILENT_MS }).text).toBe("The instructor's monitor is not answering");
    expect(s({ hostAway: true }).text).toBe("The instructor's monitor is not answering");
  });
  it('while the Ventilator view drives the patient a phone holds, and follows again once the notices stop', () => {
    expect(s({ cockpitAgoMs: 900 })).toEqual({ text: 'The ventilator is on the main screen: this monitor waits until it closes', ok: true, hold: true });
    expect(s({ cockpitAgoMs: COCKPIT_QUIET_MS })).toMatchObject({ hold: false, text: 'Following session AB2CD3' });
  });
  it("a phone wears the instructor's style upright; a style with no phone layout falls back to the default and says so (owner ruling Q4)", () => {
    const upright = new Set(['saadat-like', 'philips-like']);
    const themes = new Set(['', 'projector-light']);
    expect(phoneStyle({ skin: 'philips-like', theme: 'projector-light' }, upright, themes, 'saadat-like')).toEqual({ skin: 'philips-like', theme: 'projector-light', note: null });
    expect(phoneStyle({ skin: 'cardiac-cath-lab', theme: '' }, upright, themes, 'saadat-like')).toEqual({ skin: 'saadat-like', theme: '', note: NO_PHONE_LAYOUT });
    expect(phoneStyle({ skin: 'philips-like', theme: 'night-shift' }, upright, themes, 'saadat-like').theme).toBe('');
  });
  it('the second screen (same browser) never shows the network rows, and never holds (it gets the frames)', () => {
    expect(s({ net: false, opened: false, transport: 'connecting', sinceStartMs: 60_000, sync: 'waiting' }).text).toBe("Waiting for the instructor's monitor AB2CD3…");
    expect(s({ net: false, cockpitAgoMs: 0 }).hold).toBe(false);
    expect(s({ net: false, sync: 'incompatible' }).text).toBe('This window runs another version: reload both windows');
  });
});
