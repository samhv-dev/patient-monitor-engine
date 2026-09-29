// Monitor-fidelity harness (research/10-monitor-fidelity-audit.md, FU-5 Task 1): ONE scenario runner. Creates an engine
// (seed 7, chosen skin), dispatches a scripted timeline and every 1 s records what the MONITOR shows (the `measurement`
// numerics with their flags, NIBP phase/result, the alarm manager's `alarmStatus`) beside the TRUTH read read-only from
// the engine's committed pipeline state, plus waveform features read back from the display buffers.
// Raw per-scenario JSON goes to $PME_AUDIT_OUT/results (default <repo>/.audit-monitor, git-ignored).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-monitor');
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body | ((e: any) => void), string?];
export interface Scenario {
  name: string; title: string; mode: 'modeled' | 'manual'; skin?: string; patient?: Record<string, unknown>;
  sensors?: Record<string, string>; steps: Step[]; tEnd: number; printEvery?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  cpr: (active: boolean, quality = 1) => ev({ kind: 'cpr', active, rate: 110, quality }),
  line: (line: string, action: string, value?: number, fnHz?: number) => ev({ kind: 'line', line, action, ...(value !== undefined ? { value } : {}), ...(fnHz !== undefined ? { fnHz } : {}) }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  target: (variable: string, value: number, durationS = 0): Body => ({ type: 'setTarget', variable, value, ...(durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {}) }),
  sensor: (sensor: string, state: string, site?: string): Body => ({ type: 'attachSensor', sensor, state, ...(site ? { site } : {}) }),
  nibp: (action: 'start' | 'stat' | 'stop' | 'auto', intervalMin?: number): Body => ({ type: 'device', action: { device: 'nibp', action, ...(intervalMin ? { intervalMin } : {}) } }),
  alarm: (action: string, extra: Record<string, unknown> = {}): Body => ({ type: 'device', action: { device: 'alarm', action, ...extra } }),
};
export const VENTED: Step[] = [[1, A.ett()], [1, A.vent(5, 0.5)]];
const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on', nibp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole']);

type M = { value: number | null; flag: string; at: number } | undefined;
export interface Row {
  t: number;
  // truth
  rhythm: string; rate: number; pulseless: boolean; noEject: boolean; map: number; sbp: number; dbp: number; sv: number; co: number;
  sao2: number; paco2: number; etTrue: number; tCore: number; va: number; src: string; cpr: boolean;
  // waveform features (display buffers, last 4 s)
  plethPtp: number; artPtp: number; co2Max: number;
  // monitor
  hr: string; pr: string; prAbp: string; spo2: string; pi: string; art: string; cvp: string; et: string; awrr: string; rr: string; temp: string; nibp: string;
  /** Active alarm ids; marks: (L) latched, (A) acknowledged, (q) not sounding. */
  alarms: string;
  silenced: boolean;
}
export const show = (m: M, d = 0): string => (!m ? 'nil' : m.value === null || m.flag === 'invalid' ? '--' : m.value.toFixed(d) + (m.flag === 'questionable' ? '?' : ''));

function window(e: any, ch: string, winS: number): Float32Array {
  const rate = e.sampleRate(ch);
  const last = e.latestSampleIndex(ch);
  if (last < 0) return new Float32Array(0);
  const buf = new Float32Array(Math.round(winS * rate));
  const got = e.readSamples(ch, last - buf.length + 1, buf);
  return buf.subarray(0, got);
}
const ptp = (b: Float32Array): number => (b.length ? Math.max(...b) - Math.min(...b) : Number.NaN);

export interface Run { rows: Row[]; log: string[]; alarmLog: string[]; nibpLog: string[] }

export async function run(sc: Scenario): Promise<Run> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, ...(sc.patient ?? {}), sensors: { ...SENSORS, ...(sc.sensors ?? {}) } };
  const e = createEngine({ seed: 7, mode: sc.mode, patient, device: { skin: sc.skin ?? 'philips-like' } });
  const disp: Record<string, M> = {};
  let status: any = null;
  let nibpRes = '--/--';
  let nibpPhase = 'idle';
  let rate = Number.NaN;
  const alarmLog: string[] = [];
  const nibpLog: string[] = [];
  e.on((x: any) => {
    if (x.type === 'measurement') for (const [k, v] of Object.entries(x.values)) disp[k] = v as M;
    else if (x.type === 'alarmStatus') status = x;
    else if (x.type === 'alarm' && x.level !== undefined) alarmLog.push(`${x.t.toFixed(1)} ${x.state} ${x.id} L${x.level} "${x.text}"`);
    else if (x.type === 'nibp' && (x.result || x.phase === 'failed' || x.phase === 'inflating')) {
      if (x.result) nibpRes = `${x.result.sys}/${x.result.dia}(${x.result.map})`;
      const repeat = x.phase === 'inflating' && nibpPhase === 'inflating';
      nibpPhase = x.phase;
      if (!repeat) nibpLog.push(`${x.t.toFixed(1)} ${x.phase}${x.result ? ' ' + nibpRes + ' pr ' + x.result.pr : ''}`);
    } else if (x.type === 'state' && x.rhythm) rate = x.rhythm.rateBpm;
  }, ['measurement', 'alarmStatus', 'alarm', 'nibp', 'state']);
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  for (let t = 1; t <= sc.tEnd + 1e-9; t += 1) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      log.push(`${ts}s ${label ?? ''} ${JSON.stringify((body as { event?: unknown }).event ?? body)} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
    }
    e.advanceTo(t);
    const st = e.st;
    const c = st.hemo.circ;
    const bs = c.beats.filter((b: any) => b.t > t - 6);
    const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : Number.NaN);
    const noEject = t - c.lastEjT > 3;
    const act = status ? status.active.map((a: any) => `${a.id}${a.latched ? '(L)' : ''}${a.acked ? '(A)' : ''}${a.sounding === false && !a.acked ? '(q)' : ''}`).join(' ') : '';
    const nibpNow = nibpPhase === 'inflating' || nibpPhase === 'deflating' ? 'meas' : nibpPhase === 'failed' ? 'FAIL' : nibpRes;
    const pl = window(e, 'pleth', 4);
    rows.push({
      t, rhythm: st.rhythm.id + (st.rhythm.opts?.pulseless ? '*' : ''), rate, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
      map: bs.length ? avg('map') : Number.NaN, sbp: avg('sbp'), dbp: avg('dbp'), sv: bs.length ? avg('sv') : 0, co: noEject ? 0 : c.qFwd * 0.06,
      sao2: st.resp.o2.sa * 100, paco2: st.resp.co2.pf, etTrue: st.resp.etco2, tCore: st.resp.temp.tc, va: st.resp.vaLpm, src: st.resp.driver.source, cpr: st.hemo.cpr.active,
      plethPtp: ptp(pl), artPtp: ptp(window(e, 'abp', 4)), co2Max: Math.max(...window(e, 'co2', 10)),
      hr: show(disp.hr), pr: show(disp.pr), prAbp: show(disp.prAbp), spo2: show(disp.spo2), pi: show(disp.pi, 2),
      art: `${show(disp.abpSys)}/${show(disp.abpDia)}(${show(disp.abpMean)})`, cvp: show(disp.cvpMean), et: show(disp.etco2), awrr: show(disp.awrr), rr: show(disp.rr),
      temp: show(disp.tempCore, 1), nibp: nibpNow, alarms: act, silenced: status ? status.silencedUntil !== null && status.silencedUntil > t : false,
    });
    if (t % 60 === 0) await new Promise((r) => setImmediate(r)); // CI amendment 4: yield once per sim-minute
  }
  return { rows, log, alarmLog, nibpLog };
}

const COLS: [keyof Row, string, number][] = [
  ['t', 't', 0], ['rhythm', 'rhythm', 0], ['rate', 'rate', 0], ['map', 'MAP', 0], ['sbp', 'SBP', 0], ['dbp', 'DBP', 0], ['sv', 'SV', 1], ['co', 'CO', 2], ['sao2', 'SaO2', 1],
  ['etTrue', 'EtT', 0], ['tCore', 'Tc', 1], ['plethPtp', 'plPtp', 2], ['artPtp', 'aPtp', 0],
  ['hr', '|HR', 0], ['pr', 'PR', 0], ['prAbp', 'PRa', 0], ['spo2', 'SpO2', 0], ['pi', 'PI', 0], ['art', 'ART', 0], ['cvp', 'CVP', 0], ['et', 'EtCO2', 0], ['awrr', 'awRR', 0], ['rr', 'RRimp', 0], ['temp', 'T', 0], ['nibp', 'NIBP', 0], ['alarms', 'alarms', 0],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 10): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v));
  const marks = sc.steps.map((s) => s[0]);
  const lines = [COLS.map(([, h]) => h).join('\t')];
  for (const r of rows) {
    const near = marks.some((m) => r.t > m && r.t <= m + 3);
    if (r.t % every === 0 || near) lines.push(COLS.map(([k, , d]) => fmt(r[k], d)).join('\t') + (r.noEject ? '\tNO-EJECT' : ''));
  }
  return lines.join('\n');
}
export function save(sc: Scenario, res: Run): void {
  mkdirSync(join(OUT, 'results'), { recursive: true });
  writeFileSync(join(OUT, 'results', `${sc.name}.json`), JSON.stringify({ scenario: { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) }, ...res }));
}
