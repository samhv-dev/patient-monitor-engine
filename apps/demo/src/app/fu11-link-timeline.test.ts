// FU-11 Task E6 (F05, F09; showcase-hotfix notes): the panel's Link follows a new timeline — onsets in progress end on
// any; acute events end on a restart (a Remote has no AppSession to tell it) and stay on a bookmark restore.
import { ControllerSession, createInProcessHub, createStamper } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';

const S = 'LNK234';
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('FU-11 E6: Link on a timeline event', () => {
  it('restore clears the ramps and keeps the conditions; restart clears both', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    link.ramps.set('hr', { t0: 0, dur: 60, to: 120 });
    link.conditions.set('sepsis', 0.67);
    const stamp = createStamper(S, 'host-1');
    host.send(stamp({ kind: 'event', body: [{ type: 'timeline', t: 10, tick: 500, cause: 'restore' }] }));
    await tick();
    expect(link.ramps.size).toBe(0);
    expect(link.conditions.get('sepsis')).toBe(0.67);
    host.send(stamp({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0, cause: 'restart' }] }));
    await tick();
    expect(link.conditions.size).toBe(0);
    link.close();
  });
});
