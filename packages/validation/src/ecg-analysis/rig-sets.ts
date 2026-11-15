// The recorded sets of the ECG analysis rig (defibrillator plan E4a; the rules are engine-core's l3/ecg-analysis/rig.ts).
// The recordings are never committed: they are read from a dataset cache laid out as PhysioNet's tree
// (<root>/cudb/1.0.0/cu01.dat, <root>/ptb-xl/1.0.3/records500/…), the layout fetch.ts writes. `fetchRigSets` fills it
// (CUDB checked against PhysioNet's SHA256SUMS.txt, PTB-XL fetched as compare-ptbxl.ts and intervals-suite.ts fetch it).
//   CUDB v1.0.0, DOI 10.13026/C2X59M, Open Data Commons Attribution v1.0 (Nolle et al., Computers in Cardiology 1986).
//   PTB-XL v1.0.3, DOI 10.13026/kfzx-aw45, CC BY 4.0 (Wagner et al., Sci Data 2020).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CUDB_HELD_OUT, cudbSegments, ptbxlClass, ptbxlSegments, type RigClass, type RigRecording, type RigResult } from '@pme/engine-core';
import { fetchCached, fetchVerified, parseSums } from '../templates/fetch.ts';
import { csvCells } from '../templates/compare-ptbxl.ts';
import { decode16, decode212, parseAnnotations, parseHeader } from '../templates/wfdb.ts';

export const CUDB_PROJECT = 'cudb/1.0.0';
export const PTBXL_PROJECT = 'ptb-xl/1.0.3';
/** CUDB's records, cu01…cu35. */
export const CUDB_RECORDS = Array.from({ length: 35 }, (_, i) => `cu${String(i + 1).padStart(2, '0')}`);
/** CUDB's ADC limit: a sample at ±2000 units is clipped (extract-vf.ts's rule). */
const CUDB_ADC_LIMIT = 2000;
/** PTB-XL records per class: the first in the database's own order that qualify [ENG: test]. */
export const PTBXL_PER_CLASS = 20;
/** PTB-XL's lead II (the signal order of its headers: I, II, III, aVR, …). */
const PTBXL_LEAD_II = 1;

const td = new TextDecoder();
const read = (root: string, project: string, f: string) => new Uint8Array(readFileSync(join(root, project, f)));

/** The 29 CUDB records that are not held out, cut into VF and VT segments (lead 1, mV). */
export function loadCudb(root: string): RigRecording[] {
  const out: RigRecording[] = [];
  for (const rec of CUDB_RECORDS) {
    if (CUDB_HELD_OUT.has(rec)) continue;
    const h = parseHeader(td.decode(read(root, CUDB_PROJECT, `${rec}.hea`)));
    const ann = parseAnnotations(read(root, CUDB_PROJECT, `${rec}.atr`));
    const raw = decode212(read(root, CUDB_PROJECT, `${rec}.dat`), h.nSignals)[0] as Int16Array;
    const s0 = h.signals[0];
    if (!s0) continue;
    const mv = Float64Array.from(raw, (v) => (v - s0.baseline) / s0.gain);
    const saturated = (a: number, b: number) => {
      for (let i = a; i < b; i++) if (Math.abs(raw[i] as number) >= CUDB_ADC_LIMIT) return true;
      return false;
    };
    out.push({ set: 'cudb', id: rec, fs: h.fs, mv, segments: cudbSegments(rec, h.fs, raw.length, ann, saturated) });
  }
  return out;
}

/** Parse PTB-XL's scp_codes cell ("{'NORM': 100.0, 'SR': 0.0}"). */
export function scpCodes(cell: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of cell.matchAll(/'([^']+)':\s*([-\d.]+)/g)) out[m[1] as string] = Number(m[2]);
  return out;
}

/**
 * The PTB-XL records of each non-shockable class (rig.ts `ptbxlClass`): validated by a human, no baseline-drift,
 * static-noise, burst-noise or electrode-problem flag, the first PTBXL_PER_CLASS of each class in ecg_id order.
 */
export function ptbxlSelection(root: string, perClass = PTBXL_PER_CLASS): Partial<Record<RigClass, string[]>> {
  const lines = td.decode(read(root, PTBXL_PROJECT, 'ptbxl_database.csv')).split(/\r?\n/);
  const head = csvCells(lines[0] as string);
  const col = (k: string) => head.indexOf(k);
  const [iScp, iHr, iVal] = [col('scp_codes'), col('filename_hr'), col('validated_by_human')];
  const noise = ['baseline_drift', 'static_noise', 'burst_noise', 'electrodes_problems'].map(col);
  const sel: Partial<Record<RigClass, string[]>> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === '') continue;
    const c = csvCells(line);
    if (c[iVal] !== 'True' || noise.some((i) => (c[i] ?? '').trim() !== '')) continue;
    const cls = ptbxlClass(scpCodes(c[iScp] ?? ''));
    if (!cls) continue;
    const list = (sel[cls] ??= []);
    if (list.length < perClass) list.push(c[iHr] as string);
  }
  return sel;
}

/** The selected PTB-XL records the cache holds, lead II in mV, and the selected files it does not hold. */
export function loadPtbxl(root: string, sel: Partial<Record<RigClass, string[]>>): { recordings: RigRecording[]; missing: string[] } {
  const recordings: RigRecording[] = [];
  const missing: string[] = [];
  for (const [cls, files] of Object.entries(sel) as Array<[RigClass, string[]]>) {
    for (const f of files) {
      if (!existsSync(join(root, PTBXL_PROJECT, `${f}.dat`)) || !existsSync(join(root, PTBXL_PROJECT, `${f}.hea`))) {
        missing.push(f);
        continue;
      }
      const h = parseHeader(td.decode(read(root, PTBXL_PROJECT, `${f}.hea`)));
      const sig = decode16(read(root, PTBXL_PROJECT, `${f}.dat`), h.nSignals)[PTBXL_LEAD_II];
      const s = h.signals[PTBXL_LEAD_II];
      if (!sig || !s) continue;
      const id = f.split('/').at(-1) as string;
      recordings.push({ set: 'ptbxl', id, fs: h.fs, mv: Float64Array.from(sig, (v) => (v - s.baseline) / s.gain), segments: ptbxlSegments(id, cls, h.fs, sig.length) });
    }
  }
  return { recordings, missing };
}

/** Fill the cache: every CUDB file (SHA-256 checked), then the selected PTB-XL records; one file at a time. */
export async function fetchRigSets(roots: { cudb: string; ptbxl: string }): Promise<{ cudbFiles: number; ptbxlRecords: number }> {
  const sums = parseSums(td.decode(await fetchCached(roots.cudb, CUDB_PROJECT, 'SHA256SUMS.txt')));
  let cudbFiles = 0;
  for (const rec of CUDB_RECORDS) {
    for (const ext of ['hea', 'atr', 'dat']) {
      await fetchVerified(roots.cudb, CUDB_PROJECT, `${rec}.${ext}`, sums);
      cudbFiles++;
    }
  }
  await fetchCached(roots.ptbxl, PTBXL_PROJECT, 'ptbxl_database.csv');
  let ptbxlRecords = 0;
  for (const files of Object.values(ptbxlSelection(roots.ptbxl))) {
    for (const f of files ?? []) {
      await fetchCached(roots.ptbxl, PTBXL_PROJECT, `${f}.hea`);
      await fetchCached(roots.ptbxl, PTBXL_PROJECT, `${f}.dat`);
      ptbxlRecords++;
    }
  }
  return { cudbFiles, ptbxlRecords };
}

const q = (xs: number[], p: number) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? (s[Math.floor(p * (s.length - 1))] as number) : Number.NaN;
};

/** One line per class: records, segments, and the median [10th–90th centile] of the measurements a reader looks at first. */
export function rigSummary(r: RigResult): string {
  const keys = ['peakHz', 'moment', 'a2', 'leakage', 'ratePerMin', 'widthMs', 'acfPeak', 'complexity', 'ppMv'] as const;
  const lines = [`class records segments ${keys.join(' ')}`];
  for (const [cls, c] of Object.entries(r.classes)) {
    const rows = r.rows.filter((x) => x.cls === cls);
    const cells = keys.map((k) => {
      const xs = rows.map((x) => x.features[k] ?? Number.NaN);
      return `${q(xs, 0.5).toFixed(2)}[${q(xs, 0.1).toFixed(2)}–${q(xs, 0.9).toFixed(2)}]`;
    });
    lines.push(`${cls} ${c?.records.length ?? 0} ${c?.segments ?? 0} ${cells.join(' ')}`);
  }
  return lines.join('\n');
}
