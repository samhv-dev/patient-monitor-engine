// scripts/ci/e2e-shard-plan.mjs: the CI e2e shards are balanced by the durations recorded in the last green main run's
// Playwright JSON reports. Checks the per-file sums, the longest-first assignment, the median for an unrecorded file,
// that every file lands in exactly one shard, and that one plan, computed once in the renderer job, is what every shard
// of a set reads (research/41 row 64: on main run 42284321017 shard 1/3 of WebKit downloaded 2 of the 3 reports and
// planned its own split, so 174 tests ran against 165 listed).
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script without type declarations
import { assignShards, fileDurations, pickShard, setPlan } from '../../../scripts/ci/e2e-shard-plan.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error -- a plain .mjs script without type declarations
import { e2eMatrix, SETS } from '../../../scripts/ci/e2e-sets.mjs';

type Plan = { median: number; shards: { ms: number; files: { file: string; ms: number; recorded: boolean }[] }[] };
const plan = (files: string[], d: Record<string, number>, n: number) => assignShards(files, new Map(Object.entries(d)), n) as Plan | null;
const names = (p: Plan) => p.shards.map((s) => s.files.map((w) => w.file));

describe('e2e shard plan (scripts/ci/e2e-shard-plan.mjs)', () => {
  it('sums every result of every test per file, retries and nested describes included, across shard reports', () => {
    const result = (ms: number) => ({ duration: ms });
    const a = { suites: [{ file: 'a.e2e.ts', specs: [{ tests: [{ results: [result(100), result(50)] }] }], suites: [{ specs: [{ tests: [{ results: [result(7)] }] }] }] }] };
    const b = { suites: [{ file: 'b.e2e.ts', specs: [{ tests: [{ results: [] }] }] }, { file: 'a.e2e.ts', specs: [{ tests: [{ results: [result(3)] }] }] }] };
    expect(Object.fromEntries(fileDurations([a, b]))).toEqual({ 'a.e2e.ts': 160, 'b.e2e.ts': 0 });
  });

  it('assigns longest first onto the least-loaded shard', () => {
    // contiguous by count would put the three 9-minute files together; LPT spreads them
    const p = plan(['f1', 'f2', 'f3', 's1', 's2', 's3', 's4', 's5', 's6'], { f1: 9, f2: 9, f3: 9, s1: 3, s2: 3, s3: 2, s4: 2, s5: 1, s6: 1 }, 3)!;
    expect(names(p)).toEqual([
      ['f1', 's1', 's5'],
      ['f2', 's2', 's6'],
      ['f3', 's3', 's4'],
    ]);
    expect(p.shards.map((s) => s.ms)).toEqual([13, 13, 13]);
  });

  it('weights a file with no recorded duration as the median recorded file', () => {
    const p = plan(['a', 'b', 'c', 'new'], { a: 10, b: 4, c: 1, gone: 100 }, 2)!;
    expect(p.median).toBe(4);
    expect(p.shards.flatMap((s) => s.files).find((w) => w.file === 'new')).toEqual({ file: 'new', ms: 4, recorded: false });
    expect(plan(['a', 'b', 'c', 'd', 'new'], { a: 10, b: 4, c: 2, d: 1 }, 2)!.median).toBe(3);
  });

  it('puts every listed file in exactly one shard, recorded or not, and only listed files', () => {
    const files = Array.from({ length: 40 }, (_, i) => `t${i}.e2e.ts`);
    const d = Object.fromEntries(files.filter((_, i) => i % 3).map((f, i) => [f, (i * 7919) % 1000]));
    const p = plan(files, { ...d, 'removed.e2e.ts': 5000 }, 3)!;
    const all = names(p).flat();
    expect(all.length).toBe(files.length);
    expect([...all].sort()).toEqual([...files].sort());
  });

  it('is deterministic (every shard job computes the same plan) and returns null with nothing recorded', () => {
    const d = { a: 5, b: 5, c: 5, d: 5 };
    expect(names(plan(['d', 'c', 'b', 'a'], d, 2)!)).toEqual(names(plan(['a', 'b', 'c', 'd'], d, 2)!));
    expect(plan(['a', 'b'], { other: 1 }, 2)).toBeNull();
  });

  it("builds ci.yml's e2e matrix from each set's shard count in scripts/ci/e2e-sets.mjs: one row per shard, in order", () => {
    type Row = { browser: string; set: string; grep: string; report: string; shard: number; of: number };
    const sets = SETS as Record<string, { args: string[]; set: string; shards: number }>;
    const rows = (e2eMatrix() as { include: Row[] }).include;
    for (const [report, s] of Object.entries(sets)) {
      const mine = rows.filter((r) => r.report === report);
      expect(mine.map((r) => `${r.shard}/${r.of}`)).toEqual(Array.from({ length: s.shards }, (_, i) => `${i + 1}/${s.shards}`));
      for (const r of mine) expect([`--project=${r.browser}`, ...(r.grep ? r.grep.split(' ') : [])]).toEqual(s.args);
      expect(new Set(mine.map((r) => r.set))).toEqual(new Set([s.set]));
    }
    expect(rows.length).toBe(Object.values(sets).reduce((n, s) => n + s.shards, 0));
    expect(sets['webkit-known-flaky']?.shards).toBe(1); // the quarantine stays one job
  });

  it('every shard of a set reads the one plan: a shard index picks its files, and a set without a plan falls back whole', () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f'];
    const plans = { webkit: setPlan(files, new Map(Object.entries({ a: 9, b: 7, c: 5, d: 3, e: 2, f: 1 })), 3), chromium: null };
    const json = JSON.stringify(plans);
    const picked = [1, 2, 3].map((i) => pickShard(json, 'webkit', i));
    expect(picked.flat().sort()).toEqual(files); // each file once, across the shards that read the same plan
    expect(pickShard(json, 'chromium', 1)).toBeNull(); // no plan: every shard of the set uses Playwright's --shard
    expect(pickShard('', 'webkit', 1)).toBeNull(); // the renderer job's plan step failed: likewise, for every shard
    expect(pickShard(json, 'webkit', 4)).toBeNull();
  });

  it("ci.yml: the shard plan is computed once (the renderer job) and no e2e shard downloads reports to plan its own", () => {
    const yml = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/ci.yml'), 'utf8');
    const e2e = yml.slice(yml.indexOf('\n  e2e:\n'), yml.indexOf('\n  e2e-count:\n'));
    const renderer = yml.slice(yml.indexOf('\n  renderer:\n'), yml.indexOf('\n  e2e:\n'));
    expect(e2e).not.toMatch(/run-id:/); // no shard reads another run's reports
    expect(e2e).toMatch(/e2e-shard-plan\.mjs pick /);
    expect(renderer).toMatch(/e2e-shard-plan\.mjs plan /);
    expect(renderer).toMatch(/shard_plan:/);
  });
});
