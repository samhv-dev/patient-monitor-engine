// The report of one `pnpm validate` run (docs/validation/report.json); report.md is rendered from it.
import type { SourceId } from '../datasets/sources.ts';
import type { MorphRow } from '../morphology/suite.ts';
import type { OracleRow } from '../oracle/oracle.ts';
import type { WaveCompare } from '../regression/baseline.ts';
import type { DeterminismResult } from '../regression/determinism.ts';
import type { Grade, TargetResult, Unsupported } from '../segments/types.ts';

export interface DocSummary { id: string; title: string; suite: 'sanity' | 'gates'; measurable: boolean; unsupported: Unsupported[]; requires: string[]; wallMs: number }

export interface Report {
  schema: 'pme-validation-report/1';
  createdAt: string;
  commit: string;
  engineVersion: string;
  options: { suites: string[]; seeds: number[]; maxWindows: number | null };
  datasets: Array<{ id: SourceId; title: string; licence: string; attribution: string; windows: number }>;
  morphology: MorphRow[];
  intervals: { ptbxl: number; engine: number } | null;
  segments: { docs: DocSummary[]; results: TargetResult[] };
  regression: WaveCompare[];
  determinism: Omit<DeterminismResult, 'hashes'> | null;
  oracle: { buildHash: string | null; rows: OracleRow[]; backlog: string[] };
  wallS: number;
}

/** One calibration-queue entry: every yellow or red row, whatever suite it came from (R44). */
export interface QueueItem { suite: string; id: string; measured: string; expected: string; grade: Exclude<Grade, 'green'>; source: string }
