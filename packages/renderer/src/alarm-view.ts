// What the alarm header and tiles show (brief §6.4 visual table, §6.4.1 Saadat-like, §6.9 PUMP page) as PURE
// functions of the engine's `alarmStatus` event and the resolved skin, so they are unit-tested in Node; the DOM in
// device-ui.ts only paints them.
import type { AlarmEntry, EngineEvent, NumericId } from '@pme/engine-core';
import type { LampStyle, ResolvedSkin, TileParam } from '@pme/skins';

export type AlarmStatus = Extract<EngineEvent, { type: 'alarmStatus' }>;
/** Same-level messages rotate every this many seconds (brief §6.4.1 "messages rotate") [ENG]. */
export const ROTATE_S = 2;

export interface BarView {
  text: string;
  bg: string;
  fg: string;
  lamp: LampStyle;
  /** Lamp/numeric flash rate (Hz) and duty, 0 = steady. */
  flashHz: number;
  duty: number;
  /** Seconds left of a silence or pause, shown in the header; null when none. */
  countdownS: number | null;
  countdownKind: 'silence' | 'pause' | null;
  /** Red crossed bell in the header: every parameter alarm is OFF (brief §6.4.1). */
  allOffBell: boolean;
  /** FU-5: the message shown is a LATCHED alarm (condition gone, not acknowledged): drawn in the latched style. */
  latched: boolean;
  /** FU-5: the technical-alarm field of a split layout (skin `layout.messageBars`, mindray-like), or null. */
  inop: { text: string; bg: string; fg: string } | null;
}

/** Entries the header shows: saadat-like silence hides physiological alarms (except ASYSTOLE on a PUMP page). */
export function visibleAlarms(st: AlarmStatus, r: ResolvedSkin, t: number, pumpPage = false): AlarmEntry[] {
  if (st.pausedUntil !== null && t < st.pausedUntil) return [];
  const silenced = st.silencedUntil !== null && t < st.silencedUntil;
  return st.active.filter((a) => {
    if (!silenced || !r.skin.alarms.silence.suppressesVisual || a.category === 'technical') return true;
    return pumpPage && a.id === 'ASYSTOLE';
  });
}

/**
 * The header's message bar and lamp. FU-5 (research/00 "FU-5 opened": "a DISTINCT latched presentation"; audit M2, M3):
 * - live = raised and neither acknowledged nor latched: the level's colours, the lamp flashing (brief §6.4);
 * - latched = the condition ended, not acknowledged: the level's colour as TEXT on the idle bar, framed [ruling: the
 *   "distinct presentation" of research/00 "FU-5 opened"; Philips documents no style change, it keeps the message and
 *   the flashing numerics and drops the tone and lamp under audible latching Off, [S2] IFU p. 40];
 * - acknowledged: the skin's acknowledged colours;
 * - the pool is every UNACKNOWLEDGED message, live or latched (a visually latched alarm is still active, [S2] IFU
 *   p. 40), ordered by level — so a latched red is never hidden by a live yellow (review ruling 4); acknowledged
 *   messages show only when nothing unacknowledged is left;
 * - `messageBar.rotateAll` (philips-like): the whole pool rotates every two seconds — "all active alarm messages are
 *   shown in the alarm status area in succession … the message changes every two seconds" ([S2] IFU p. 29–30); the
 *   other rotating skins rotate the pool's top level, with the unacknowledged INOPs rotated in under a red or yellow
 *   top, so LEADS OFF is seen under a red APNEA; a split layout (mindray-like, [S4] §3.6 technical and physiological
 *   alarm areas) shows the INOPs in their own field;
 * - the lamp (and, in the audio bridge, the tone) come from LIVE entries only.
 */
export function barView(st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): BarView {
  const a = r.skin.alarms;
  const silenceLeft = st?.silencedUntil != null ? st.silencedUntil - t : null;
  const pauseLeft = st?.pausedUntil != null ? st.pausedUntil - t : null;
  const countdownKind = pauseLeft !== null && pauseLeft > 0 ? 'pause' : silenceLeft !== null && silenceLeft > 0 && a.silence.headerCountdown ? 'silence' : null;
  const countdownS = countdownKind === 'pause' ? Math.ceil(pauseLeft as number) : countdownKind === 'silence' ? Math.ceil(silenceLeft as number) : null;
  const shown = st ? visibleAlarms(st, r, t, pumpPage) : [];
  const split = r.skin.layout.messageBars === 'split-technical-physiological';
  const techs = shown.filter((e) => e.category === 'technical');
  const pick = (xs: AlarmEntry[]) => (a.messageBar.rotate ? (xs[Math.floor(t / ROTATE_S) % xs.length] as AlarmEntry) : (xs[0] as AlarmEntry));
  const style = (e: AlarmEntry) =>
    e.acked ? a.messageBar.acknowledged : e.latched ? { bg: a.messageBar.idle.bg, fg: a.messageBar[`L${e.level}`].bg } : a.messageBar[`L${e.level}`];
  const inopE = split && techs.length > 0 ? pick(techs) : null;
  const base = { countdownS, countdownKind, allOffBell: st?.allOff === true, inop: inopE ? { text: inopE.text, ...style(inopE) } : null } as const;
  const phys = split ? shown.filter((e) => e.category !== 'technical') : shown;
  if (phys.length === 0) return { ...base, text: '', bg: a.messageBar.idle.bg, fg: a.messageBar.idle.fg, lamp: 'off', flashHz: 0, duty: a.lamp.duty, latched: false };
  const live = phys.filter((e) => !e.acked && !e.latched);
  const unacked = phys.filter((e) => !e.acked); // live ∪ latched
  const pool = (unacked.length > 0 ? unacked : phys).slice().sort((x, y) => x.level - y.level || x.since - y.since);
  const lvl = (pool[0] as AlarmEntry).level;
  const same = a.messageBar.rotateAll ? pool : pool.filter((x) => x.level === lvl);
  if (!a.messageBar.rotateAll && !split && lvl < 3) for (const x of techs) if (!x.acked && !same.includes(x)) same.push(x); // an acknowledged INOP stays in the review, not the bar
  const e = pick(same);
  const top = live.length > 0 ? Math.min(...live.map((x) => x.level)) : 3;
  const key = `L${top}` as 'L1' | 'L2' | 'L3';
  const lamp = live.length > 0 ? a.lamp[key] : 'off';
  const flashHz = lamp.endsWith('-flash') ? (top === 1 ? a.lamp.flashHz.L1 : a.lamp.flashHz.L2) : 0;
  return { ...base, text: e.text, ...style(e), lamp, flashHz, duty: a.lamp.duty, latched: e.latched && !e.acked };
}

/** Numerics each tile shows, and the skin limit keys whose switch and limits it displays. */
export const TILE_NUMERICS: Readonly<Record<TileParam, { numerics: NumericId[]; limits: string[] }>> = {
  HR: { numerics: ['hr'], limits: ['HR'] },
  NIBP: { numerics: ['nibpSys', 'nibpDia', 'nibpMean'], limits: ['NIBP_S', 'NIBP_D', 'NIBP_M'] },
  ART: { numerics: ['abpSys', 'abpDia', 'abpMean'], limits: ['ART_S', 'ART_D', 'ART_M'] },
  IBP1: { numerics: ['abpSys', 'abpDia', 'abpMean'], limits: ['ART_S', 'ART_D', 'ART_M'] },
  CVP: { numerics: ['cvpMean'], limits: ['CVP_M'] },
  IBP2: { numerics: ['cvpMean'], limits: ['CVP_M'] },
  PAP: { numerics: ['papSys', 'papDia', 'papMean'], limits: ['PAP_S', 'PAP_D', 'PAP_M'] },
  IBP3: { numerics: ['papSys', 'papDia', 'papMean'], limits: ['PAP_S', 'PAP_D', 'PAP_M'] },
  IBP4: { numerics: [], limits: [] },
  SpO2: { numerics: ['spo2'], limits: ['SpO2'] },
  TEMP: { numerics: ['tempCore'], limits: ['TEMP', 'T1'] },
  RR: { numerics: ['rr'], limits: ['RR', 'AWRR'] },
  CO2: { numerics: ['etco2'], limits: ['EtCO2', 'EtCO2_pctV'] },
  ST: { numerics: ['stII'], limits: ['ST_mV'] },
  NMT: { numerics: ['tofRatio', 'tofCount', 'ptc'], limits: [] }, // Stage 7f
  BFA: { numerics: ['di', 'sr'], limits: [] }, // Stage 7f
  AGENTS: { numerics: ['etAa', 'mac'], limits: [] }, // FU-8 (A10-E5)
  ICP: { numerics: ['icpMean', 'cpp'], limits: ['ICP', 'CPP'] }, // Stage 7d
  PbtO2: { numerics: ['pbto2'], limits: [] }, // Stage 7d
  UO: { numerics: ['uop'], limits: [] }, // Stage 7d
};

export interface TileAlarmView {
  /** Flash level of the numeric (1 or 2), or null. */
  flash: 1 | 2 | 3 | null;
  /** Red crossed bell: the tile's parameter alarm is OFF (brief §6.4.1). */
  bellOff: boolean;
  /** "50–150" style limits, shown only when the alarm is ON (brief §6.4.1); '~' marks approximate (brief §6.8). */
  limits: string;
}

export function tileAlarmView(param: TileParam, st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): TileAlarmView {
  const spec = TILE_NUMERICS[param];
  const keys = spec.limits.filter((k) => st?.limits[k]);
  if (!st || keys.length === 0) return { flash: null, bellOff: false, limits: '' };
  const enabled = keys.some((k) => st.limits[k]?.enabled);
  const shown = r.skin.alarms.numericFlash ? visibleAlarms(st, r, t, pumpPage) : [];
  const mine = shown.filter((a) => !a.acked && a.category === 'physiological' && a.numeric !== undefined && spec.numerics.includes(a.numeric)); // FU-5: INOPs mark, not flash
  const flash = mine.length > 0 ? (Math.min(...mine.map((a) => a.level)) as 1 | 2 | 3) : null;
  const l = st.limits[keys[0] as string];
  const fmt = (v: number | null) => (v === null ? '--' : String(Math.round(v * 10) / 10));
  const limits = enabled && l ? `${l.approximate ? '~' : ''}${fmt(l.low)}–${fmt(l.high)}` : '';
  return { flash, bellOff: !enabled, limits };
}
