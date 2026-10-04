// FU-10 Task A1 (E1): the onset of MH from a susceptible patient's triggers (7e thermal/mh.ts), and who owns the state.
import { describe, expect, it } from 'vitest';
import { mhActivity, mhFromExposure, mhOnsetT } from '../../../src/l2/thermal/mh.ts';
import { MH_PROFILE_SEVERITY, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_DEFAULT_S, MH_VOLATILE_LATENCY_S } from '../../../src/l2/thermal/params.ts';

describe('FU-10 E1: MH onset from the trigger exposure (Visoiu 2014: sooner after succinylcholine)', () => {
  it('the onset is the earliest trigger plus its latency; the volatile latency is the agent\'s; no exposure, no onset', () => {
    expect(mhOnsetT(undefined)).toBeNull();
    expect(mhOnsetT({})).toBeNull();
    expect(mhOnsetT({ sux: 300 })).toBe(300 + MH_SUX_LATENCY_S);
    expect(mhOnsetT({ volatile: 300, volatileAgent: 'sevoflurane' })).toBe(300 + MH_VOLATILE_LATENCY_S.sevoflurane!);
    expect(mhOnsetT({ volatile: 300, volatileAgent: 'desflurane' })).toBe(300 + MH_VOLATILE_LATENCY_S.desflurane!);
    expect(mhOnsetT({ volatile: 300 })).toBe(300 + MH_VOLATILE_LATENCY_DEFAULT_S);
    expect(mhOnsetT({ volatile: 100, volatileAgent: 'sevoflurane', sux: 600 })).toBe(600 + MH_SUX_LATENCY_S);
  });
  it('starts the Stage 3 MH state once; a later succinylcholine brings a still-latent volatile onset forward', () => {
    const a = mhFromExposure(null, { volatile: 100, volatileAgent: 'sevoflurane' }, undefined, 120);
    expect(a.owner).toBe('auto');
    expect(a.mh).toEqual({ severity: MH_PROFILE_SEVERITY, t0: 100 + MH_VOLATILE_LATENCY_S.sevoflurane! });
    expect(mhActivity(a.mh, 200)).toBe(0); // latent
    const b = mhFromExposure(a.mh, { volatile: 100, volatileAgent: 'sevoflurane', sux: 400 }, a.owner, 400);
    expect(b.mh?.t0).toBe(400 + MH_SUX_LATENCY_S);
  });
  it('D3 (review F4): an instructor MH consumes the exposure — kept while set, NOT restarted once the instructor clears it', () => {
    const instr = { severity: 0.5, t0: 50 };
    const seen = mhFromExposure(instr, { sux: 100 }, undefined, 110);
    expect(seen).toEqual({ mh: instr, owner: 'instructor' });
    expect(mhFromExposure(null, { sux: 100 }, seen.owner, 500)).toEqual({ mh: null, owner: 'instructor' });
  });
  it('an MH the triggers made and the instructor then cleared is not restarted', () => {
    expect(mhFromExposure(null, { sux: 10 }, 'auto', 900)).toEqual({ mh: null, owner: 'auto' });
  });
});
