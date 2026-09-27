// Manifest building (decision 2) and manifest-driven download. The command line is src/datasets/cli-fetch.ts.
import { fetchZenodo } from './fetch-zenodo.ts';
import { readManifest, type Manifest } from './manifest.ts';
import { MGHDB, mghMeta } from './mghdb.ts';
import { PWDB_FILES, PWDB_RECORD } from './pwdb.ts';
import type { AnalysisWindow } from './signals.ts';
import { fetchCached, fetchVerified, parseSums, sha256 } from '../templates/fetch.ts';
import { decode212, parseHeader } from '../templates/wfdb.ts';
import { findWindows, loadCase, selectCandidates, VITALDB, vitaldbSums } from './vitaldb.ts';

export const VITALDB_TARGET = 40;
export const MGH_TARGET = 16;
/** MGH/MF window: 600–900 s (after set-up artefacts, inside every record's ≥ 40 min) [ENG]. */
export const MGH_WINDOW: [number, number] = [600, 900];

export async function selectVitaldb(cache: string, limit: number): Promise<Manifest> {
  const td = new TextDecoder();
  const sums = await vitaldbSums(cache);
  const clinical = td.decode(await fetchVerified(cache, VITALDB, 'clinical_data.csv', sums));
  const files: Record<string, string> = { 'clinical_data.csv': sums.get('clinical_data.csv') ?? '' };
  const windows: AnalysisWindow[] = [];
  const rejected: Manifest['rejected'] = [];
  const cands = selectCandidates(clinical, 64);
  for (const c of cands) {
    if (new Set(windows.map((w) => w.record)).size >= Math.min(limit, VITALDB_TARGET)) break;
    const f = await loadCase(cache, c.caseid, sums);
    const ws = findWindows(f, c);
    process.stdout.write(`${c.caseid}: ${ws.length} window(s)\n`);
    if (ws.length === 0) {
      rejected.push({ record: c.caseid, reason: 'no window with ECG II + ART + PLETH + CO2 ≥ 99 % present, plausible ART, IPPV, stable HR' });
      continue;
    }
    files[`vital_files/${c.caseid}.vital`] = sums.get(`vital_files/${c.caseid}.vital`) ?? '';
    windows.push(...ws);
  }
  return { schema: 'pme-dataset-manifest/1', source: 'vitaldb', createdAt: new Date().toISOString(), selection: 'selectCandidates(clinical_data.csv, 64) → first cases with findWindows() ≥ 1 (plan Task 4/6, decision 2)', files, windows, rejected };
}

export async function selectMghdb(cache: string, limit: number): Promise<Manifest> {
  const td = new TextDecoder();
  const sums = parseSums(td.decode(await fetchCached(cache, MGHDB, 'SHA256SUMS.txt')));
  const records = td.decode(await fetchCached(cache, MGHDB, 'RECORDS')).split(/\s+/).filter(Boolean);
  const files: Record<string, string> = {};
  const windows: AnalysisWindow[] = [];
  const rejected: Manifest['rejected'] = [];
  const seenRhythm = new Map<string, number>();
  for (const rec of records) {
    if (windows.length >= Math.min(limit, MGH_TARGET)) break;
    const heaText = td.decode(await fetchVerified(cache, MGHDB, `${rec}.hea`, sums));
    const m = mghMeta(heaText);
    const kind = m.rhythm.toLowerCase().split(/\s+(with|@)\s+/)[0] ?? '';
    if (m.channels.abp === undefined || m.channels.co2 === undefined || m.channels.ecgII === undefined) {
      rejected.push({ record: rec, reason: 'no ART, CO2 or ECG II channel' });
      continue;
    }
    if ((seenRhythm.get(kind) ?? 0) >= 3) continue; // at most 3 per underlying rhythm → diversity [ENG]
    const h = parseHeader(heaText);
    const dat = await fetchVerified(cache, MGHDB, `${rec}.dat`, sums);
    const [a, b] = MGH_WINDOW;
    const abp = decode212(dat, h.nSignals)[m.channels.abp]?.subarray(a * h.fs, b * h.fs);
    const s = h.signals[m.channels.abp];
    if (!abp || !s) continue;
    const mmHg = Array.from(abp, (v) => (v - s.baseline) / s.gain).sort((p, q) => p - q);
    const sbp = mmHg[Math.floor(0.95 * mmHg.length)] as number;
    const dbp = mmHg[Math.floor(0.05 * mmHg.length)] as number;
    if (!(sbp > 60 && sbp < 250 && dbp > 20 && sbp - dbp > 10)) {
      rejected.push({ record: rec, reason: `implausible ART in ${a}–${b} s (${sbp.toFixed(0)}/${dbp.toFixed(0)})` });
      continue;
    }
    seenRhythm.set(kind, (seenRhythm.get(kind) ?? 0) + 1);
    const hrm = /@\s*(\d+)\s*bpm/.exec(m.rhythm);
    files[`${rec}.hea`] = sums.get(`${rec}.hea`) ?? '';
    files[`${rec}.dat`] = sums.get(`${rec}.dat`) ?? '';
    windows.push({
      source: 'mghdb', record: rec, fromS: a, toS: b, site: 'unknown', hr: hrm ? Number(hrm[1]) : Number.NaN, sbp: Math.round(sbp), dbp: Math.round(dbp),
      etco2: null, vent: /controlled|intermittent/i.test(m.ventilation) ? { rr: 12, vtMl: 600, peep: 5 } : null, ageY: m.ageY, sex: m.sex,
      tags: [`rhythm:${kind}`, `vent:${m.ventilation}`, `dx:${m.diagnosis}`],
    });
    process.stdout.write(`${rec}: ${kind}\n`);
  }
  return { schema: 'pme-dataset-manifest/1', source: 'mghdb', createdAt: new Date().toISOString(), selection: `RECORDS in order; ART+CO2+ECG II; ≤ 3 per underlying rhythm; plausible ART in ${MGH_WINDOW.join('–')} s (plan Task 6)`, files, windows, rejected };
}

/** Download everything the manifests list; verify every hash. Returns the number of files checked. */
export async function fetchAll(cache: string): Promise<number> {
  let n = 0;
  for (const src of ['vitaldb', 'mghdb'] as const) {
    const m = readManifest(src);
    if (!m) continue;
    const project = src === 'vitaldb' ? VITALDB : MGHDB;
    for (const [file, want] of Object.entries(m.files)) {
      const got = sha256(await fetchCached(cache, project, file));
      if (got !== want) throw new Error(`${project}/${file}: SHA-256 ${got} ≠ manifest ${want}`);
      n++;
    }
  }
  for (const f of Object.values(PWDB_FILES)) {
    await fetchZenodo(cache, PWDB_RECORD, f.file, f.md5);
    n++;
  }
  return n;
}
