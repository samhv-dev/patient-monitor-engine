import { describe, expect, it } from 'vitest';
import { mergeSkinSource, resolveSkin } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('philips-like (over iec-defaults)', () => {
  it('inherits the base and overrides what the file sets', () => {
    const s = mergeSkinSource('philips-like');
    expect(s.sweep.gapPx).toBe(16); // base
    expect(s.hr.method).toBe('mean-12rr'); // own
    expect(s.provenance['hr.method']?.source).toContain('Philips-like mean-12rr');
    expect(s.provenance['sweep.gapPx']?.tag).toBe('unverified'); // base entry kept
    expect('extends' in s).toBe(false);
  });

  it('renders Monitor as the letter M at 10 mm/mV; HR is the plain mean of 12', () => {
    const r = resolveSkin('philips-like');
    expect(r.render.lanes[0]).toMatchObject({ lane: 'ECG1', color: '#00FF00', gainMmPerMv: 10, autoGain: false, label: 'II  M' });
    expect(r.render.lanes[1]?.label).toBe('V1  M');
    expect(r.render.hrMethod.engine).toBe('mean12');
    expect(r.render.ecgFilter).toMatchObject({ engineMode: 'monitor', exact: true });
  });

  it('Philips factory limits by age band; unpublished cells stay null', () => {
    const r = resolveSkin('philips-like');
    expect(r.limits.adult?.HR).toEqual([50, 120]);
    expect(r.limits.neo?.SpO2).toEqual([85, 95]);
    expect(r.limits.paed?.RR).toBeNull();
    expect(r.approximateLimits).toEqual({ adult: [], paed: [], neo: [] });
  });

  it('IEC-style alarms: red 10 s, yellow 20 s, 2-pulse INOP, arrhythmia off (OR)', () => {
    const r = resolveSkin('philips-like');
    expect(r.audio.alarm).toMatchObject({ profile: 'iec-style', repeatS: { L1: 10, L2: 20 }, lowPulses: 2 });
    expect(r.skin.arrhythmia.defaultOn).toBe(false);
    expect(r.skin.alarms.messageBar.prefix).toBe('asterisks');
  });

  it('byLabel skins must colour ART/CVP/PAP', () => {
    const ph = structuredClone(resolveSkin('philips-like').skin);
    delete ph.colors.PAP;
    expect(validate('skin', ph).ok).toBe(false);
  });
});
