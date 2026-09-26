import { describe, expect, it } from 'vitest';
import { calibrationQueue, gatingFailures, renderMarkdown } from '../../src/report/write.ts';
import type { Report } from '../../src/report/types.ts';

const R: Report = {
  schema: 'pme-validation-report/1', createdAt: '2026-09-26T00:00:00Z', commit: 'abc1234', engineVersion: '0.0.0',
  options: { suites: ['morphology', 'sanity'], seeds: [11], maxWindows: null },
  datasets: [{ id: 'vitaldb', title: 'VitalDB (PhysioNet copy)', licence: 'CC BY 4.0', attribution: 'Lee HC et al. Sci Data 9:279 (2022).', windows: 2 }],
  morphology: [
    { band: 'V1', metric: 'rToFootMs', group: 'HR 70–90', recorded: { n: 400, median: 160, p25: 155, p75: 165 }, engine: { n: 400, median: 158, p25: 157, p75: 159 }, ks: 0.42, w1: 9.7, engineStat: 158, expected: '140–180', grade: 'green', errPct: 0, source: 'brief §9 V1' },
    { band: 'PPV', metric: 'ppvPct', group: 'all', recorded: { n: 6, median: 8.8, p25: 5, p75: 10 }, engine: { n: 6, median: 16, p25: 14, p75: 18 }, ks: 0.67, w1: 7, engineStat: 16, expected: '5.8–11.8', grade: 'red', errPct: 35, source: '[ENG]' },
  ],
  intervals: { ptbxl: 100, engine: 12 },
  segments: {
    docs: [{ id: 's1-phenylephrine', title: 'Phenylephrine', suite: 'sanity', measurable: false, unsupported: [{ t: 0, type: 'setMode', reason: 'MODELED mode arrives in Stage 7' }], requires: ['7a'], wallMs: 3 }],
    results: [{ doc: 't21-mh', segment: '10min', target: 'etco2', type: 'Range', series: 'numeric:etco2', source: 'tables §7 21', measured: 76.5, expected: '51.0–69.0', errPct: 10.9, grade: 'yellow', pass: true }],
  },
  regression: [{ case: 'sinus-75', channel: 'abp', n: 625, failed: 0, maxRelErr: 0, rms: 0, grade: 'green' }],
  determinism: { runs: 216, nonDeterministic: [], goldenChanged: [] },
  oracle: { buildHash: 'a3be71adfd49aaaaaaaa', rows: [{ scenario: 'O-VF', id: 'ph-30min', ours: Number.NaN, pulse: 10.58, expected: 'Pulse > 7.45 (D1)', grade: 'green', note: 'known Pulse disagreement D1' }], backlog: ['O3'] },
  wallS: 1234,
};

describe('report writer', () => {
  it('queues every yellow and red row, reds first', () => {
    expect(calibrationQueue(R).map((q) => [q.grade, q.suite, q.id])).toEqual([['red', 'morphology', 'PPV · all'], ['yellow', 'segments', 't21-mh/10min/etco2']]);
  });
  it('red rows and non-determinism gate; yellow does not', () => {
    expect(gatingFailures(R)).toEqual(['morphology PPV · all']);
    expect(gatingFailures({ ...R, morphology: [], determinism: { runs: 2, nonDeterministic: ['sinus/1'], goldenChanged: [] } })).toEqual(['determinism: sinus/1']);
  });
  it('renders every section, attribution and the not-measurable list', () => {
    const md = renderMarkdown(R);
    for (const s of ['# Validation report', '## Datasets and attribution', 'Lee HC et al.', '## Morphology', '| 🔴 | PPV | all |', '### Not measurable on this build', 'MODELED mode arrives in Stage 7', '## Waveform regression', '## Determinism (V9)', '## Pulse oracle', 'known Pulse disagreement D1', '## Calibration queue (R44)', 'Ali: decision']) expect(md).toContain(s);
  });
});
