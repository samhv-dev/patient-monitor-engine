// What the alarm header and tiles show (brief §6.4 visual table, §6.4.1 Saadat-like, §6.9 PUMP page) as PURE
// functions of the engine's `alarmStatus` event and the resolved skin, so they are unit-tested in Node; the DOM in
// device-ui.ts only paints them.
import type { AlarmEntry, EngineEvent, NumericId } from '@pme/engine-core';
import type { LampStyle, ResolvedSkin, TileParam } from '@pme/skins';

export type AlarmStatus = Extract<EngineEvent, { type: 'alarmStatus' }>;
/** Same-level messages rotate every this many seconds (brief §6.4.1 "messages rotate") [ENG]. */
export const ROTATE_S = 2;
/** The skin's rotation period (saadat-like 6 s, research/34 §2), else ROTATE_S. */
export function rotateS(r: ResolvedSkin): number {
  return r.skin.alarms.messageBar.rotateS ?? ROTATE_S;
}

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
  /** The message shown is a LATCHED alarm (condition gone, not acknowledged): drawn in the latched style. */
  latched: boolean;
  /** The technical-alarm field of a split layout (skin `layout.messageBars`, mindray-like), or null. */
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
 * The header's message bar and lamp, with a DISTINCT latched presentation (research/00):
 * - live = raised and neither acknowledged nor latched: the level's colours, the lamp flashing (brief §6.4);
 * - latched = the condition ended, not acknowledged: the level's colour as TEXT on the idle bar, framed [the
 *   "distinct presentation" of research/00; Philips documents no style change, it keeps the message and
 *   the flashing numerics and drops the tone and lamp under audible latching Off, [S2] IFU p. 40];
 * - acknowledged: the skin's acknowledged colours;
 * - the pool is every UNACKNOWLEDGED message, live or latched (a visually latched alarm is still active, [S2] IFU
 *   p. 40), ordered by level — so a latched red is never hidden by a live yellow; acknowledged
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
  const pick = (xs: AlarmEntry[]) => (a.messageBar.rotate ? (xs[Math.floor(t / rotateS(r)) % xs.length] as AlarmEntry) : (xs[0] as AlarmEntry));
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
  NMT: { numerics: ['tofRatio', 'tofCount', 'ptc'], limits: [] },
  BFA: { numerics: ['di', 'sr'], limits: [] },
  AGENTS: { numerics: ['etAa', 'mac'], limits: [] },
  ICP: { numerics: ['icpMean', 'cpp'], limits: ['ICP', 'CPP'] },
  PbtO2: { numerics: ['pbto2'], limits: [] },
  UO: { numerics: ['uop'], limits: [] },
};

/**
 * The PR tile's status lines (rc.3 saadat-like, research/34 §3 row 4, IMG_8113), from data the renderer has: PACE from
 * the skin's pace-detect default, ST from the skin's ST default (no runtime ST switch exists) and its alarm switch, PVCs
 * from the analysis switch — blank when on (there is no PVC numeric, research/34 §8 O1).
 */
export function hrStatusLines(r: ResolvedSkin, st: AlarmStatus | null, stII: string): Array<{ text: string; bellOff: boolean }> {
  const arr = st?.arrhythmiaAnalysis === true;
  return [
    { text: `PACE: ${r.skin.ecg.paceDetectDefault ? 'ON' : 'OFF'}`, bellOff: false },
    // ST analysis off cannot alarm: its bell is crossed whatever the ST limit switch (pass 2, E114: alarms on, IMG_8113)
    { text: r.skin.st.defaultOn ? `ST: ${stII}` : 'ST: OFF', bellOff: !r.skin.st.defaultOn || !st?.limits.ST_mV?.enabled },
    { text: arr ? 'PVCs: ' : 'PVCs: OFF', bellOff: !arr },
  ];
}

export interface TileAlarmView {
  /** Flash level of the numeric (1 or 2), or null. */
  flash: 1 | 2 | 3 | null;
  /** Red crossed bell: the tile's parameter alarm is OFF (brief §6.4.1). */
  bellOff: boolean;
  /** "50–150" style limits, shown only when the alarm is ON (brief §6.4.1); '~' marks approximate (brief §6.8). */
  limits: string;
  /**
   * Every limit pair of the tile (its own keys, then the parts' keys) that the alarm status carries, ON or OFF — the
   * skins that print limits always (`alarms.limitsDisplay: 'always'`, saadat-like, research/34 §3 row 12). Whole
   * numbers, except temperatures (one decimal); '' for a missing side.
   */
  pairs: Array<{ key: string; high: string; low: string }>;
}

const TEMP_KEYS = new Set(['TEMP', 'T1', 'T2', 'dT']);
/** A limit as the pair prints it: CO2 limits come in mmHg from %V × 7.6 (engine profile.ts), so whole numbers. */
function pairFmt(key: string, v: number | null): string {
  if (v === null) return '';
  return TEMP_KEYS.has(key) || key === 'ST_mV' ? v.toFixed(1) : String(Math.round(v));
}

export function tileAlarmView(param: TileParam, st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false, partKeys: string[] = []): TileAlarmView {
  const spec = TILE_NUMERICS[param];
  const keys = spec.limits.filter((k) => st?.limits[k]);
  // a tile's own pairs are those of its own numerics (the RR tile lists AWRR, the CO2 line's, which it does not show);
  // a part's key is its own (R-T I2)
  const pairs = [...new Set([...spec.limits, ...partKeys])].flatMap((key) => {
    const l = st?.limits[key];
    if (!l || (!partKeys.includes(key) && !(spec.numerics as string[]).includes(l.numeric))) return [];
    return [{ key, high: pairFmt(key, l.high), low: pairFmt(key, l.low) }];
  });
  if (!st || keys.length === 0) return { flash: null, bellOff: false, limits: '', pairs };
  const enabled = keys.some((k) => st.limits[k]?.enabled);
  const shown = r.skin.alarms.numericFlash ? visibleAlarms(st, r, t, pumpPage) : [];
  const mine = shown.filter((a) => !a.acked && a.category === 'physiological' && a.numeric !== undefined && spec.numerics.includes(a.numeric)); // INOPs mark, not flash
  const flash = mine.length > 0 ? (Math.min(...mine.map((a) => a.level)) as 1 | 2 | 3) : null;
  const l = st.limits[keys[0] as string];
  const fmt = (v: number | null) => (v === null ? '--' : String(Math.round(v * 10) / 10));
  const limits = enabled && l ? `${l.approximate ? '~' : ''}${fmt(l.low)}–${fmt(l.high)}` : '';
  return { flash, bellOff: !enabled, limits, pairs };
}
