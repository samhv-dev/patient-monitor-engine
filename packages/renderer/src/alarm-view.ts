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

export function barView(st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): BarView {
  const a = r.skin.alarms;
  const silenceLeft = st?.silencedUntil != null ? st.silencedUntil - t : null;
  const pauseLeft = st?.pausedUntil != null ? st.pausedUntil - t : null;
  const countdownKind = pauseLeft !== null && pauseLeft > 0 ? 'pause' : silenceLeft !== null && silenceLeft > 0 && a.silence.headerCountdown ? 'silence' : null;
  const countdownS = countdownKind === 'pause' ? Math.ceil(pauseLeft as number) : countdownKind === 'silence' ? Math.ceil(silenceLeft as number) : null;
  const base = { countdownS, countdownKind, allOffBell: st?.allOff === true } as const;
  const shown = st ? visibleAlarms(st, r, t, pumpPage) : [];
  if (shown.length === 0) return { ...base, text: '', bg: a.messageBar.idle.bg, fg: a.messageBar.idle.fg, lamp: 'off', flashHz: 0, duty: a.lamp.duty };
  const live = shown.filter((e) => !e.acked);
  const pool = live.length > 0 ? live : shown;
  const top = Math.min(...pool.map((e) => e.level));
  const same = pool.filter((e) => e.level === top);
  const e = a.messageBar.rotate ? (same[Math.floor(t / ROTATE_S) % same.length] as AlarmEntry) : (same[0] as AlarmEntry);
  const key = `L${top}` as 'L1' | 'L2' | 'L3';
  const colours = live.length > 0 ? a.messageBar[key] : a.messageBar.acknowledged;
  const lamp = live.length > 0 ? a.lamp[key] : 'off';
  const flashHz = lamp.endsWith('-flash') ? (top === 1 ? a.lamp.flashHz.L1 : a.lamp.flashHz.L2) : 0;
  return { ...base, text: e.text, bg: colours.bg, fg: colours.fg, lamp, flashHz, duty: a.lamp.duty };
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
  const mine = shown.filter((a) => !a.acked && a.numeric !== undefined && spec.numerics.includes(a.numeric));
  const flash = mine.length > 0 ? (Math.min(...mine.map((a) => a.level)) as 1 | 2 | 3) : null;
  const l = st.limits[keys[0] as string];
  const fmt = (v: number | null) => (v === null ? '--' : String(Math.round(v * 10) / 10));
  const limits = enabled && l ? `${l.approximate ? '~' : ''}${fmt(l.low)}–${fmt(l.high)}` : '';
  return { flash, bellOff: !enabled, limits };
}
