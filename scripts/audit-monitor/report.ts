// The fidelity report (FU-5 Task 1): the research/10 §13 suite's key numbers, computed from $PME_AUDIT_OUT/results
// (whatever scenarios were run last). Each line names the suite item; the Vitest suite (test/engine/fidelity-*.test.ts)
// holds the pass criteria, this report only measures. Run alone: node … scripts/audit-monitor/report.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT, type Row } from './runner.ts';

type Res = { scenario: { name: string; skin?: string }; rows: Row[]; alarmLog: string[]; nibpLog: string[] };
const R = join(OUT, 'results');
const load = (n: string): Res | null => (existsSync(join(R, `${n}.json`)) ? (JSON.parse(readFileSync(join(R, `${n}.json`), 'utf8')) as Res) : null);
const num = (s: string) => Number.parseFloat(String(s).replace('?', ''));
const plain = (s: string) => s !== '--' && s !== 'nil' && !s.endsWith('?'); // a valid (not questionable) value
const ids = (r: Row) => r.alarms.split(' ').filter(Boolean);
const has = (r: Row, re: RegExp) => ids(r).some((a) => re.test(a));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : Number.NaN);
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
const raises = (d: Res, id: RegExp, from = 0, to = Infinity) => d.alarmLog.filter((l) => { const m = l.match(/^([\d.]+) raised (\S+)/); return !!m && id.test(m[2] as string) && +(m[1] as string) >= from && +(m[1] as string) < to; });
const SPO2_INOP = /^spo2(NonPulsatile|LowPerf)/;
const ARR = /^(ASYSTOLE|VFIB|VTAC|EXTREME_BRADY|EXTREME_TACHY|BRADY|TACHY|PAUSE|PVCS)/;

function lowFlow(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const rows = d.rows;
  const base = mean(rows.filter((r) => r.t >= 30 && r.t <= 60).map((r) => r.plethPtp));
  const on = rows.find((r, i) => rows.slice(i, i + 20).length === 20 && rows.slice(i, i + 20).every((x) => x.map < 30));
  const contra = rows.filter((r) => r.t >= 10 && plain(r.spo2) && (r.pr === '--' || r.pi === '--')).length;
  if (!on) return `${name}: MAP never < 30 for 20 s; SpO2-valid-with-PR/PI-invalid rows ${contra}`;
  const at = rows.find((r) => r.t === on.t + 20) as Row;
  const late = rows.filter((r) => r.t >= on.t + 20 && r.t <= on.t + 60);
  const validFrac = rows.filter((r) => r.t >= on.t + 20).filter((r) => plain(r.spo2)).length / Math.max(1, rows.filter((r) => r.t >= on.t + 20).length);
  return `${name}: MAP < 30 from ${on.t} s; +20 s SpO2 "${at.spo2}" PI ${at.pi} PR ${at.pr} INOP ${has(at, SPO2_INOP) ? ids(at).filter((a) => SPO2_INOP.test(a)).join(',') : 'none'}; pleth ptp ${f((100 * mean(late.map((r) => r.plethPtp))) / base, 0)} % of baseline; SpO2 plain-valid ${f(100 * validFrac, 0)} % of rows after; SpO2-valid-with-PR/PI-invalid rows ${contra}`;
}

function pea(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 62 && r.t < 150);
  const firstInv = (k: 'spo2' | 'pr') => d.rows.find((r) => r.t > 60 && r[k] === '--')?.t;
  const artValid = w.filter((r) => /^\d+\/\d+\(\d+\)$/.test(r.art)).length;
  return `${name}: HR mean ${f(mean(w.map((r) => num(r.hr))), 0)}; PR invalid at +${f((firstInv('pr') ?? Number.NaN) - 60, 0)} s, SpO2 at +${f((firstInv('spo2') ?? Number.NaN) - 60, 0)} s; ART shown valid in ${artValid} of ${w.length} rows; ART INOP ${w.some((r) => has(r, /^abpNonPulsatile/)) ? 'yes' : 'no'}; ART low alarms cleared during PEA ${d.alarmLog.filter((l) => /cleared ART_/.test(l) && +l.split(' ')[0]! > 62 && +l.split(' ')[0]! < 150).length}`;
}

function vf(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const v = raises(d, /^VFIB$/)[0];
  const tv = v ? +v.split(' ')[0]! : Number.NaN;
  const during = raises(d, /^(HR_|EXTREME_|VTAC)/, tv, 150);
  const cpr = d.rows.filter((r) => r.t >= 170 && r.t <= 290);
  const end = d.rows[d.rows.length - 1] as Row;
  return `${name}: VFIB at +${f(tv - 60)} s; other rate alarms raised during VF ${during.length}${during.length ? ' (' + [...new Set(during.map((l) => l.split(' ')[2]))].join(',') + ')' : ''}; CPR SpO2 "${cpr[40]?.spo2}", PR mean ${f(mean(cpr.map((r) => num(r.pr))), 0)}, EtCO2 ${f(Math.min(...cpr.map((r) => num(r.et))), 0)}–${f(Math.max(...cpr.map((r) => num(r.et))), 0)}; NIBP ${d.nibpLog.filter((l) => /failed/.test(l)).length} failed; at ${end.t} s: ${end.alarms || '-'}`;
}

function asystole(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const a = raises(d, /^ASYSTOLE$/)[0];
  return `${name}: ASYSTOLE at +${f(a ? +a.split(' ')[0]! - 60 : Number.NaN)} s; HR_LOW/EXTREME_BRADY raised 60–150 s: ${raises(d, /^(HR_LOW|EXTREME_BRADY)$/, 60, 150).length}`;
}

function leadsOff(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 62 && r.t < 120);
  const shown = [...new Set(w.map((r) => r.hr))].slice(0, 6).join(',');
  return `${name}: HR shown during leads off {${shown}} ("0" in ${w.filter((r) => r.hr === '0').length} rows); HR alarms raised within 15 s of reconnect ${raises(d, /^HR_/, 120, 135).length}`;
}

function leadsOffRed(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 102 && r.t < 160);
  return `${name}: rows with the LEADS OFF INOP active beside a red APNEA ${w.filter((r) => has(r, /^ecgLeadsOff/) && has(r, /^apnoea/)).length} of ${w.length} (visibility in the bar: renderer test)`;
}

function apnoea(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const r = raises(d, /^apnoea-/, 120, 200);
  const clear = d.rows.find((x) => x.t > 180 && !ids(x).some((a) => /^apnoea-/.test(a) && !/\(L\)|\(q\)/.test(a)));
  const end = d.rows[d.rows.length - 1] as Row;
  return `${name}: APNEA raises for one apnoea ${r.length} (${r.map((l) => l.split(' ').slice(0, 3).join(' ')).join('; ')}); live alarm gone ${clear ? '+' + (clear.t - 180) + ' s' : 'never'} after ventilation resumed; at ${end.t} s: ${end.alarms || '-'}`;
}

function impOnly(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t >= 150 && r.t <= 400);
  return `${name}: RR(imp) shown {${[...new Set(w.map((r) => r.rr))].slice(0, 8).join(',')}}; HR {${f(Math.min(...w.map((r) => num(r.hr))), 0)}–${f(Math.max(...w.map((r) => num(r.hr))), 0)}}; APNEA active in ${w.filter((r) => has(r, /^apnoea-/)).length} of ${w.length} rows; RR alarms ${raises(d, /^RR_/, 150, 400).length}`;
}

function disconnect(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const a = raises(d, /^apnoea-co2$/, 60, 120)[0];
  const et5 = d.rows.find((r) => r.t > 180 && num(r.et) < 5);
  return `${name}: CO2 apnoea at +${f(a ? +a.split(' ')[0]! - 60 : Number.NaN)} s after disconnect; EtCO2 < 5 at +${f(et5 ? et5.t - 180 : Number.NaN, 0)} s after oesophageal`;
}

function desat(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const s = d.rows.find((r) => r.t > 120 && r.sao2 < 90);
  const m = d.rows.find((r) => r.t > 120 && num(r.spo2) < 90);
  const des = raises(d, /^DESAT$/)[0];
  const low = Math.min(...d.rows.filter((r) => r.t > 120).map((r) => num(r.spo2)).filter(Number.isFinite));
  return `${name}: SaO2 < 90 at ${s?.t} s, displayed at ${m?.t} s (lag ${m && s ? m.t - s.t : '–'} s); DESAT raised ${des ? des.split(' ')[0] : 'never'}; lowest shown ${low}`;
}

function nibp(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const done = d.nibpLog.filter((l) => /done/.test(l)).map((l) => l.split(' ')[2]);
  return `${name}: NIBP ${done.length} results [${done.join(' ')}], ${d.nibpLog.filter((l) => /failed/.test(l)).length} failed`;
}

function chatter(): string {
  const out: string[] = [];
  for (const f of existsSync(R) ? readdirSync(R).filter((x) => x.endsWith('.json')).sort() : []) {
    const d = JSON.parse(readFileSync(join(R, f), 'utf8')) as Res;
    const c: Record<string, number> = {};
    for (const l of d.alarmLog) {
      const m = l.match(/^[\d.]+ raised (\S+)/);
      if (m) c[m[1] as string] = (c[m[1] as string] ?? 0) + 1;
    }
    const bad = Object.entries(c).filter(([, n]) => n >= 4).map(([k, n]) => `${k}×${n}`);
    const start = d.alarmLog.filter((l) => /raised/.test(l) && +l.split(' ')[0]! < 15 && !/nibp|ecgLeadsOff|spo2SensorOff/.test(l)).map((l) => l.split(' ')[2]);
    if (bad.length || start.length) out.push(`  ${d.scenario.name.padEnd(20)} chatter ${bad.join(' ') || '-'} | startup (t < 15 s) ${start.join(' ') || '-'}`);
  }
  return out.join('\n');
}

function hrStep(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const resp = (t0: number, from: number, to: number) => {
    const hit = d.rows.filter((r) => r.t > t0 && r.t <= t0 + 55).find((r) => Math.abs(num(r.hr) - to) <= 0.05 * Math.abs(to - from));
    return hit ? `${hit.t - t0} s` : '> 55 s';
  };
  return `${name}: 80→120 ${resp(60, 80, 120)}; 120→40 ${resp(120, 120, 40)}; 40→80 ${resp(180, 40, 80)}`;
}

function tour(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const maxArr = Math.max(...d.rows.map((r) => ids(r).filter((a) => ARR.test(a)).length));
  const vt = raises(d, /^VTAC$/, 300, 360)[0];
  const pauses: number[] = [];
  let open: number | null = null;
  for (const l of d.alarmLog) {
    if (/ raised PAUSE /.test(l)) open = +l.split(' ')[0]!;
    if (/ cleared PAUSE /.test(l) && open !== null) { pauses.push(+l.split(' ')[0]! - open); open = null; }
  }
  return `${name}: max arrhythmia alarms at once ${maxArr}; VTAC at +${f(vt ? +vt.split(' ')[0]! - 300 : Number.NaN)} s; PAUSE shown ${pauses.length}× (shortest ${f(Math.min(...pauses))} s)`;
}

function silenceNew(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const r = d.rows.find((x) => x.t === 66) as Row | undefined;
  return `${name}: at 66 s (VF raised during the silence): ${r?.alarms || '-'}; silence running ${r?.silenced}`;
}

function hover(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const c = (re: RegExp) => raises(d, re, 20, 200).length;
  const texts = [...new Set(d.alarmLog.filter((l) => / raised (CVP|HR)_/.test(l)).map((l) => l.split('"')[1]))].slice(0, 4);
  return `${name}: CVP_M_HIGH raised ${c(/^CVP_M_HIGH$/)}×, HR_LOW ${c(/^HR_LOW$/)}× in 180 s; texts ${texts.join(' | ') || '-'}`;
}

function probes(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const at = (t: number) => (d.rows.find((r) => r.t === t) as Row | undefined)?.alarms || '-';
  return `${name}: temp off (45 s) {${at(45)}}; ART zeroing (72 s) {${at(72)}}; ART atmosphere (105 s) {${at(105)}}; CO2 occluded (145 s) {${at(145)}}`;
}

export function report(): string {
  return [
    '## Fidelity report (research/10 §13 suite items)',
    ' 1 low flow:', '  ' + lowFlow('A1m-map-ladder'), '  ' + lowFlow('A2-ali-b7'),
    ' 2 PEA:', ...['A5-pea', 'A5-pea-mr', 'A5-pea-sa'].map((n) => '  ' + pea(n)),
    ' 3 VF → CPR → ROSC:', ...['A4-vf', 'A4-vf-mr', 'A4-vf-sa'].map((n) => '  ' + vf(n)),
    ' 4 asystole:', ...['A6-asystole', 'A6-asystole-mr', 'A6-asystole-sa'].map((n) => '  ' + asystole(n)),
    ' 5 leads off:', '  ' + leadsOff('F1-leadsoff'), '  ' + leadsOff('F1-leadsoff-sa'), '  ' + leadsOffRed('F3-leadsoff-red'), '  ' + leadsOffRed('F3-leadsoff-red-sa'),
    ' 6 apnoea 60 s:', ...['D1-apnoea', 'D1-apnoea-mr', 'D1-apnoea-sa', 'F2-apnoea-ack'].map((n) => '  ' + apnoea(n)),
    ' 7 impedance-only apnoea:', '  ' + impOnly('D4-apnoea-imp'),
    ' 8 disconnect / oesophageal:', '  ' + disconnect('D2-disconnect'), '  ' + probes('G2-probes'),
    ' 9 desaturation lag:', '  ' + desat('A8-desat-finger'), '  ' + desat('A8e-desat-ear'),
    '10 NIBP:', ...['C3-lowpp', 'A1-map-ladder', 'A1m-map-ladder', 'C2-af-nibp', 'A2-ali-b7'].map((n) => '  ' + nibp(n)),
    '11 limit hygiene:', '  ' + hover('G1-hover'), chatter(),
    '12 HR response:', ...['B2-step', 'B2-step-mr', 'B2-step-sa'].map((n) => '  ' + hrStep(n)),
    '13 rhythm tour:', ...['B1-rhythms', 'B1a-rhythms-arrOn', 'B1-rhythms-mr', 'B1-rhythms-sa'].map((n) => '  ' + tour(n)),
    '14 silence:', ...['F4-silence-new', 'F4-silence-new-mr', 'F4-silence-new-sa'].map((n) => '  ' + silenceNew(n)),
    '15 startup: see "startup (t < 15 s)" under 11',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(report());
