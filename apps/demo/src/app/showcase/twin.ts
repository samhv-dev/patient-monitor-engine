// The twin run (docs/plans/scenario-builder.md §7.3, piece B7): a /1 card and its /2 port on the same patient and seed
// (harness.ts runCard: engine seed 7, the card's own seed for its runner), the /1 card pressed by its button labels at the
// path's times, the /2 port pressed through its action ids at the /1 run's ABSOLUTE press times; then the differences in
// §7.3's terms. A statement of differences, never a claim of identity, and nothing tuned to agree: both runs advance on
// the engine's own clock to the same stop, `untilS` sim seconds. Test-only: nothing in the app imports this file.
import type { ScenarioDoc, ScenarioDocV2 } from '@pme/controller/scenario';
import { runCard, type Run } from './harness.ts';

/** One press of the path: sim time, the /1 button label, the /2 action id. */
export interface Press { t: number; v1: string; v2: string }
/** A row of ports.json. */
export interface PortRow {
  v1: string;
  v2: string;
  presses: Press[];
  untilS: number;
  accepted: Array<{ at: string; changed: string; source: string }>;
  result: string;
}

export interface TwinReport {
  pressed: { v1: number[]; v2: number[] };
  /** O1 (i): the engine's received commands (type, payload, applied tick), position by position. */
  commands: { count: number; diffs: string[]; firstTick?: number };
  /** O1 (i): the 1 Hz trace (every sample but the state's name), second by second. */
  trace: { seconds: number; differing: number; first?: { t: number; keys: string[] }; keys: string[] };
  /** O1 (ii): each /2 phase entry (its nth) against the /1 state entry of the same id (NaN: none). */
  phases: Array<{ id: string; n: number; v1: number; v2: number }>;
  /** O4: a script entry on an action's taking that did not fire in that press's stage group on its tick. */
  o4: { lines: string[] };
  stop: string;
  /** The whole report, printed. */
  lines: string[];
}

const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const key = (x: Run['commands'][number]) => JSON.stringify({ tick: x.tick, ...x.c });

export async function twinRun(v1: ScenarioDoc, v2: ScenarioDocV2, presses: readonly Press[], untilS: number): Promise<TwinReport> {
  const a = await runCard(v1.id, presses.map((p) => ({ press: p.v1, t: p.t })), untilS, undefined, 0.1, v1);
  // the /2 port at the /1 run's absolute press times (a press /1 never took is not pressed in /2 either)
  const acts = presses.flatMap((p, i) => (Number.isNaN(a.pressed[i] as number) ? [] : [{ press: p.v2, action: p.v2, t: a.pressed[i] as number }]));
  const b = await runCard(v2.id, acts, untilS, undefined, 0.1, v2);
  const pressedB = presses.map((_, i) => {
    const k = presses.slice(0, i + 1).filter((__, j) => !Number.isNaN(a.pressed[j] as number)).length - 1;
    return Number.isNaN(a.pressed[i] as number) ? Number.NaN : (b.pressed[k] as number);
  });

  const diffs: string[] = [];
  let firstTick: number | undefined;
  for (let i = 0; i < Math.max(a.commands.length, b.commands.length); i++) {
    const x = a.commands[i];
    const y = b.commands[i];
    if (x && y && key(x) === key(y)) continue;
    diffs.push(`#${i}: /1 ${x ? key(x) : '(none)'} | /2 ${y ? key(y) : '(none)'}`);
    firstTick ??= Math.min(x?.tick ?? Infinity, y?.tick ?? Infinity);
  }

  let differing = 0;
  let first: TwinReport['trace']['first'];
  const all: string[] = [];
  const n = Math.max(a.rows.length, b.rows.length);
  for (let i = 0; i < n; i++) {
    const x = a.rows[i] as unknown as Record<string, unknown> | undefined;
    const y = b.rows[i] as unknown as Record<string, unknown> | undefined;
    const keys = [...new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])].filter((k) => k !== 'state' && JSON.stringify(x?.[k]) !== JSON.stringify(y?.[k]));
    if (!keys.length) continue;
    differing++;
    first ??= { t: (x?.t ?? y?.t) as number, keys };
    for (const k of keys) if (!all.includes(k)) all.push(k);
  }

  const phases: TwinReport['phases'] = [];
  const seen: Record<string, number> = {};
  for (const [t, id] of b.states) {
    const k = (seen[id] = (seen[id] ?? 0) + 1);
    phases.push({ id, n: k, v1: a.states.filter(([, s]) => s === id)[k - 1]?.[0] ?? Number.NaN, v2: t });
  }

  // O4: every script entry anchored on an action's nth taking went out in that press's stage group, on its tick
  const o4: string[] = [];
  for (const e of v2.script ?? []) {
    const m = typeof e.on === 'string' ? /^action:(.+)#(\d+)$/.exec(e.on) : null;
    if (!m) continue;
    const i = acts.map((x, j) => [x, j] as const).filter(([x]) => x.action === m[1])[Number(m[2]) - 1]?.[1];
    if (i === undefined) continue;
    const group = `act-${i}`;
    const press = b.commands.filter((c) => c.group === group);
    const want = e.commands.map((c) => JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => k !== '$comment'))));
    const tick = press[0]?.tick;
    for (const w of want) if (!press.some((c) => JSON.stringify(c.c) === w && c.tick === tick)) o4.push(`${e.id}: ${w} not in press ${group}'s group on tick ${tick}`);
  }

  const stop = `stopped at ${untilS} s of sim time on the engine’s clock`;
  const report: TwinReport = {
    pressed: { v1: a.pressed, v2: pressedB }, commands: { count: Math.max(a.commands.length, b.commands.length), diffs, ...(firstTick !== undefined ? { firstTick } : {}) },
    trace: { seconds: n, differing, ...(first ? { first } : {}), keys: all }, phases, o4: { lines: o4 }, stop, lines: [],
  };
  report.lines = [
    `twin run: /1 ${v1.id} | /2 ${v2.id}; ${stop}; presses /1 ${a.pressed.map(mmss).join(', ')} | /2 ${pressedB.map((t) => (Number.isNaN(t) ? 'never' : mmss(t))).join(', ')}`,
    `command stream: ${diffs.length ? `${diffs.length} of ${report.commands.count} differ` : `identical (${report.commands.count})`}`, ...diffs.slice(0, 20).map((d) => `  ${d}`),
    `trace: ${differing ? `${differing} of ${n} s differ, first at ${mmss(first!.t)} (${first!.keys.join(', ')})` : `identical (${n} s)`}`,
    'phase timing (/2 phase entry | /1 state entry of the same id):', ...phases.map((p) => `  ${p.id}${p.n > 1 ? ` (${p.n})` : ''}: /2 ${mmss(p.v2)} | /1 ${Number.isNaN(p.v1) ? 'none' : mmss(p.v1)}`),
    `O4: ${o4.length ? o4.join('; ') : 'every script entry on a press fired in its group, on its tick'}`,
    `refused: /1 ${a.refused.length}, /2 ${b.refused.length}`,
  ];
  return report;
}

/** The port check's words (§7.3): what the builder shows, from a manifest row's `result`. */
export function portCheckWords(r: TwinReport, accepted: number): string {
  const cmd = r.commands.diffs.length ? `command stream differs (${r.commands.diffs.length} of ${r.commands.count} commands, first at tick ${r.commands.firstTick})` : 'command stream identical';
  const trace = r.trace.differing ? `trace differs in ${r.trace.differing} of ${r.trace.seconds} s (first at ${mmss(r.trace.first!.t)}: ${r.trace.first!.keys.join(', ')})` : 'trace identical';
  const o4 = r.o4.lines.length ? `; ${r.o4.lines.length} script ${r.o4.lines.length === 1 ? 'entry' : 'entries'} out of their press's group` : '';
  return `Port check: ${cmd}; ${trace}${o4}; ${accepted} ${accepted === 1 ? 'beat' : 'beats'} changed by design`;
}
