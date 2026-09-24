// probability/else on the `scenario` PRNG stream (brief §3.3, §7.4; BUILD-PLAN Stage 6 acceptance 5).
import { describe, expect, it } from 'vitest';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { doc, shock } from './fixtures.ts';

const d = doc([{ id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3, else: 'c' }]);
/** Shock at 10 s; returns where it went. */
function trial(seed: number): string {
  const r = new ScenarioRunner(d, { seed });
  r.start(0);
  r.advance(10, [shock()]);
  return r.stateId;
}
/** The roll outcomes (1 = success) of up to 20 shocks, 2 min apart, with else → stay. */
function path(seed: number): string {
  const r = new ScenarioRunner(doc([{ id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0.3 }]), { seed });
  r.start(0);
  for (let k = 1; k <= 20 && r.stateId === 'a'; k++) r.advance(k * 120, [shock()]);
  return r.log.flatMap((e) => (e.op === 'roll' ? [e.success ? 1 : 0] : [])).join('');
}

describe('probability', () => {
  it('same seed → same path', () => {
    for (const seed of [1, 42, 99]) expect(path(seed)).toBe(path(seed));
  });

  it('different seeds → different paths', () => {
    const paths = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(path));
    expect(paths.size).toBeGreaterThan(3);
  });

  it('the document seed is the default; an explicit seed overrides it', () => {
    expect(new ScenarioRunner(d).seed).toBe(1);
    expect(new ScenarioRunner(d, { seed: 9 }).seed).toBe(9);
  });

  it('p = 0.3 over 10,000 seeded trials gives 0.30 ± 0.01; failures take else', () => {
    let hit = 0;
    let other = 0;
    for (let seed = 1; seed <= 10_000; seed++) {
      const s = trial(seed);
      if (s === 'b') hit++;
      else if (s === 'c') other++;
    }
    expect(hit + other).toBe(10_000);
    console.log(`p 0.3 × 10,000: ${hit / 10_000}`);
    expect(Math.abs(hit / 10_000 - 0.3)).toBeLessThanOrEqual(0.01);
  });

  it('p = 0.3 over 1,000 seeded trials is within 3σ (±0.045)', () => {
    let hit = 0;
    for (let seed = 20_001; seed <= 21_000; seed++) if (trial(seed) === 'b') hit++;
    console.log(`p 0.3 × 1,000: ${hit / 1000}`);
    expect(Math.abs(hit / 1000 - 0.3)).toBeLessThanOrEqual(0.045);
  });

  it('p = 1 always fires', () => {
    const r = new ScenarioRunner(doc([{ id: 'x', when: { afterS: 1 }, probability: 1 }]));
    r.start(0);
    r.advance(1);
    expect(r.stateId).toBe('b');
  });
});
