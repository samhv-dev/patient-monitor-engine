import { describe, expect, it } from 'vitest';
import { build, createEngine, engineKey, version } from '../src/index.ts';

describe('@pme/engine-core', () => {
  it('exports its version', () => {
    expect(version).toBe('1.0.0-rc.1');
  });
  // FU-11 A1 (Stage 8b): the snapshot compatibility key is version + build; the workspace build is 'dev'.
  it('keys snapshots by version and build, and refuses a snapshot from another build naming both keys', () => {
    expect(build).toBe('dev');
    expect(engineKey).toBe('1.0.0-rc.1+dev');
    const e = createEngine({ seed: 1 });
    expect(e.version).toBe(engineKey);
    e.advanceTo(1);
    const snap = e.snapshot();
    expect(snap.engineVersion).toBe(engineKey);
    expect(() => createEngine({ seed: 1 }).restore(snap)).not.toThrow();
    const other = { ...snap, engineVersion: '1.0.0-rc.1+abc1234' };
    expect(() => createEngine({ seed: 1 }).restore(other)).toThrow('snapshot is from engine version 1.0.0-rc.1+abc1234, this is 1.0.0-rc.1+dev');
  });
});
