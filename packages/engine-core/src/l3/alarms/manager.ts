// Alarm manager (brief §6.4 IEC-style, §6.4.1 Saadat-like): turns conditions into raised / cleared / acked /
// silenced / paused alarm events with the skin's priorities, delays, latching, silence and pause rules, and keeps
// one `alarmStatus` summary for the renderer. Conditions are computed elsewhere (conditions.ts); this module only
// owns their life cycle. All state is plain JSON-safe data (engine snapshot).
import type { AlarmDeviceAction, AlarmEntry, AlarmLevel, AlarmPriority, LimitState } from '../../types-device.ts';
import type { EngineEvent, NumericId } from '../../types.ts';
import { limitGroup, type DeviceProfile } from './profile.ts';

/** One condition as evaluated this tick. */
export interface Condition {
  id: string;
  level: AlarmLevel;
  category: 'physiological' | 'technical';
  text: string;
  /** Must hold continuously this long before the alarm is raised (s). */
  delayS: number;
  numeric?: NumericId;
  /** FU-5: explained by a higher alarm (conditions.ts CHAIN): not raised, and an active entry clears without latching. */
  suppressed?: boolean;
  /** FU-5: once raised, the entry stays at least this long (an event alarm such as PAUSE; audit M13). */
  holdS?: number;
  /** FU-8 (R50 F6): kept only by a clear hysteresis — the value is not beyond the limit; the entry keeps its last text. */
  held?: boolean;
}

export interface AlarmConfig {
  /** Per-parameter switch by limit-key group ('HR', 'NIBP', …). */
  enabled: Record<string, boolean>;
  /** Limits edited by `setLimit`, by limit key. */
  limits: Record<string, { low: number | null; high: number | null }>;
  arrhythmia: boolean;
  volume: number;
}

export interface AlarmMgrState {
  profile: DeviceProfile;
  cfg: AlarmConfig;
  /** Condition id → sim time it became true (while not yet raised). */
  pending: Record<string, number>;
  active: Record<string, AlarmEntry>;
  silencedUntil: number | null;
  /** FU-11 (owner ruling Q1, AL01): the highest priority (lowest level) sounding when Silence was pressed; a new alarm
   *  above it ends the silence on every profile. null = nothing was sounding (a pre-silence); absent in older snapshots. */
  silencedLevel?: AlarmLevel | null;
  pausedUntil: number | null;
  lastStatusT: number;
  dirty: boolean;
  /** FU-5: alarm id → the time before which a raised event alarm is kept (Condition.holdS); absent in older snapshots. */
  hold?: Record<string, number>;
}

export const LEVEL_PRIORITY: Readonly<Record<AlarmLevel, AlarmPriority>> = { 1: 'high', 2: 'medium', 3: 'low' };
/**
 * FU-5: the alarms visual latching 'lethal' keeps — the lethal arrhythmias (research/00 FU-5 ruling, IEC 60601-1-8
 * convention: they latch visually until acknowledged; limit alarms do not latch). The set is Mindray's "High,
 * unadjustable" arrhythmia group (research/05 §6 [S4] BeneVision N App. C.1.1.2: asystole, VF, V-Tach, extreme rates).
 */
export const LETHAL_ALARMS: ReadonlySet<string> = new Set(['ASYSTOLE', 'VFIB', 'VTAC', 'EXTREME_BRADY', 'EXTREME_TACHY']);

/** FU-5: whether a latching mode covers an alarm. INOPs never latch (Philips IFU [S2] p. 40). */
export function latchCovers(mode: 'off' | 'lethal' | 'red' | 'redYellow', e: Pick<AlarmEntry, 'id' | 'level' | 'category'>): boolean {
  if (e.category === 'technical' || mode === 'off') return false;
  if (mode === 'lethal') return LETHAL_ALARMS.has(e.id);
  return mode === 'red' ? e.level === 1 : e.level <= 2;
}
const STATUS_EVERY_S = 1; // alarmStatus at 1 Hz besides every change (brief §3.4 "alarm changes") [ENG]

export function defaultConfig(p: DeviceProfile): AlarmConfig {
  const enabled: Record<string, boolean> = {};
  for (const key of Object.keys(p.limits)) {
    const g = limitGroup(key);
    enabled[g] = p.switches[g] ?? p.factoryEnabled;
  }
  return { enabled, limits: {}, arrhythmia: p.arrhythmia.defaultOn, volume: p.volume.default };
}

export function createAlarmMgr(p: DeviceProfile): AlarmMgrState {
  return { profile: p, cfg: defaultConfig(p), pending: {}, active: {}, silencedUntil: null, pausedUntil: null, lastStatusT: -1, dirty: true };
}

/** Switch skin or age band: the new profile's defaults replace the configuration; active alarms are re-evaluated. */
export function setProfile(s: AlarmMgrState, p: DeviceProfile, t: number, out: EngineEvent[]): void {
  for (const a of Object.values(s.active)) emitAlarm(out, t, a, 'cleared');
  s.profile = p;
  s.cfg = defaultConfig(p);
  s.pending = {};
  s.active = {};
  s.silencedUntil = null;
  s.pausedUntil = null;
  s.dirty = true;
}

/** Effective limit (after setLimit) for a limit key, or null when the skin has none. */
export function limitOf(s: AlarmMgrState, key: string): { low: number | null; high: number | null } | null {
  const d = s.profile.limits[key];
  if (!d) return null;
  return s.cfg.limits[key] ?? d; // the LimitDef carries low/high (no allocation: this runs every tick)
}

export function isEnabled(s: AlarmMgrState, key: string): boolean {
  return s.cfg.enabled[limitGroup(key)] ?? s.profile.factoryEnabled;
}

function emitAlarm(out: EngineEvent[], t: number, a: AlarmEntry, state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'): void {
  out.push({ type: 'alarm', t, id: a.id, priority: LEVEL_PRIORITY[a.level], category: a.category, state, text: a.text, level: a.level });
}

/** Validation for `device alarm` actions: a reason, or undefined when accepted. */
export function validateAlarmAction(s: AlarmMgrState, a: AlarmDeviceAction): string | undefined {
  switch (a.action) {
    case 'silence':
    case 'ack':
    case 'enableAll':
      return undefined;
    case 'pause':
      return s.profile.pauseS === null ? `alarm pause has no function on ${s.profile.skin}` : undefined;
    case 'setLimit': {
      if (!a.param || !s.profile.limits[a.param]) return `no alarm limit ${String(a.param)} on ${s.profile.skin}`;
      const lo = a.low ?? null;
      const hi = a.high ?? null;
      if ((lo !== null && !Number.isFinite(lo)) || (hi !== null && !Number.isFinite(hi))) return 'limits must be finite numbers';
      return lo !== null && hi !== null && lo >= hi ? 'low must be below high' : undefined;
    }
    case 'enable':
      if (!a.param || !Object.keys(s.profile.limits).some((k) => k === a.param || limitGroup(k) === a.param)) return `no alarm ${String(a.param)} on ${s.profile.skin}`;
      return typeof a.value === 'boolean' ? undefined : 'enable needs value true or false';
    case 'arrhythmiaAnalysis':
      return typeof a.value === 'boolean' ? undefined : 'arrhythmiaAnalysis needs value true or false';
    case 'setVolume': {
      const v = s.profile.volume;
      return typeof a.value === 'number' && Number.isInteger(a.value) && a.value >= v.min && a.value <= v.max ? undefined : `volume must be an integer ${v.min}–${v.max}`;
    }
    default:
      return `unknown alarm action ${String((a as { action: string }).action)}`;
  }
}

/** Acknowledge: latched alarms clear, live ones are marked acknowledged and fall silent (brief §6.4; [S2] p. 32). */
function acknowledgeAll(s: AlarmMgrState, t: number, out: EngineEvent[]): void {
  for (const [id, e] of Object.entries(s.active)) {
    if (e.latched) {
      delete s.active[id];
      emitAlarm(out, t, e, 'cleared');
    } else if (!e.acked) {
      e.acked = true;
      e.sounding = false;
      emitAlarm(out, t, e, 'acked');
    }
  }
}

/** Apply a validated `device alarm` action at sim time t. */
export function applyAlarmAction(s: AlarmMgrState, a: AlarmDeviceAction, t: number, out: EngineEvent[]): void {
  s.dirty = true;
  const p = s.profile;
  switch (a.action) {
    case 'silence': {
      // FU-5: Philips' Silence and Mindray's Alarm Reset acknowledge every active alarm and INOP; there is no mute timer,
      // so a new alarm sounds at once (research/05 §6 [S2] p. 11, 32; [S4] §10.8)
      if (p.silence.mode === 'acknowledge') {
        acknowledgeAll(s, t, out);
        return;
      }
      if (s.silencedUntil !== null) {
        s.silencedUntil = null; // pressing Silence again ends it (brief §6.4.1)
        return;
      }
      s.silencedUntil = t + (p.silence.durationS ?? 0);
      const levels = Object.values(s.active).map((e) => e.level);
      s.silencedLevel = levels.length ? (Math.min(...levels) as AlarmLevel) : null;
      for (const e of Object.values(s.active)) {
        if (e.category === 'technical' && p.silence.technicalActsAsAck) {
          e.acked = true;
          emitAlarm(out, t, e, 'acked');
        } else emitAlarm(out, t, e, 'silenced');
      }
      return;
    }
    case 'pause': {
      s.pausedUntil = t + (p.pauseS as number);
      for (const e of Object.values(s.active)) emitAlarm(out, t, e, 'paused');
      s.active = {};
      s.pending = {};
      return;
    }
    case 'ack':
      acknowledgeAll(s, t, out);
      return;
    case 'setLimit': {
      const key = a.param as string;
      const cur = limitOf(s, key) as { low: number | null; high: number | null };
      s.cfg.limits[key] = { low: a.low !== undefined ? a.low : cur.low, high: a.high !== undefined ? a.high : cur.high };
      return;
    }
    case 'enable':
      s.cfg.enabled[limitGroup(a.param as string)] = a.value as boolean;
      return;
    case 'enableAll':
      for (const g of Object.keys(s.cfg.enabled)) s.cfg.enabled[g] = a.value !== false;
      return;
    case 'arrhythmiaAnalysis':
      s.cfg.arrhythmia = a.value as boolean;
      return;
    case 'setVolume':
      s.cfg.volume = a.value as number;
      return;
  }
}

/**
 * Advance the life cycle to sim time t with this tick's true conditions: raise after the delay, clear when gone
 * (unless latched), end silence/pause on time or on a new alarm (saadat), and emit alarmStatus on change and at 1 Hz.
 */
export function stepAlarms(s: AlarmMgrState, t: number, conds: readonly Condition[], out: EngineEvent[]): void {
  const p = s.profile;
  if (s.pausedUntil !== null && t >= s.pausedUntil) {
    s.pausedUntil = null;
    s.dirty = true;
  }
  if (s.silencedUntil !== null && t >= s.silencedUntil) {
    s.silencedUntil = null;
    s.dirty = true;
  }
  const now = new Set<string>();
  let superseded: Set<string> | null = null;
  for (const c of conds) {
    if (c.suppressed) {
      (superseded ??= new Set()).add(c.id);
      continue;
    }
    now.add(c.id);
    if (s.pausedUntil !== null) continue; // pause: nothing is raised (brief §6.4 "Pause stops all alarms")
    const e = s.active[c.id];
    if (e) {
      if (e.latched) {
        e.latched = false; // the condition came back while latched
        e.sounding = !e.acked;
        s.dirty = true;
      }
      // FU-8 (F1, G-FU4 2026-09-29): the message carries the value NOW — "the message shows **SpO2 94<96 (deviation
      // and limit)" (research/05 §2.4, [S2]). The text was frozen at the raise: `**ABPm 66<70` stood while the mean
      // fell to 19 in Ali's tamponade PEA, and `**ABPm 252>110` 13 s after ROSC while the mean was back near 120. A
      // condition only the clear hysteresis holds keeps the last violating text (R50 F6: no `**ABPs 90<90`)
      if (e.text !== c.text && c.held !== true) {
        e.text = c.text;
        s.dirty = true;
      }
      continue;
    }
    const since = (s.pending[c.id] ??= t);
    if (t - since + 1e-9 < c.delayS) continue;
    delete s.pending[c.id];
    const entry: AlarmEntry = { id: c.id, level: c.level, category: c.category, text: c.text, since: t, latched: false, acked: false, sounding: true };
    if (c.numeric) entry.numeric = c.numeric;
    if (c.holdS) (s.hold ??= {})[c.id] = t + c.holdS;
    s.active[c.id] = entry;
    // brief §6.4.1: on a profile with cancelOnNewAlarm any new alarm ends silence; FU-11 (owner ruling Q1, AL01): on every
    // profile a new alarm of HIGHER priority than those silenced does (no vendor source documents a mute that holds)
    const above = s.silencedLevel != null && entry.level < s.silencedLevel;
    if (s.silencedUntil !== null && (p.silence.cancelOnNewAlarm || above)) s.silencedUntil = null;
    emitAlarm(out, t, entry, 'raised');
    s.dirty = true;
  }
  for (const id of Object.keys(s.pending)) if (!now.has(id)) delete s.pending[id];
  for (const [id, e] of Object.entries(s.active)) {
    if (now.has(id)) continue;
    const gone = superseded?.has(id) === true; // FU-5: superseded by a higher alarm — cleared, never latched
    const holdUntil = s.hold?.[id];
    if (!gone && holdUntil !== undefined && t < holdUntil) continue;
    if (s.hold && holdUntil !== undefined) delete s.hold[id];
    // FU-5: latching per vendor (skin `alarms.latching`): the message stays until acknowledged, the sound only under
    // audible latching; an acknowledged alarm whose condition ends clears ([S2] p. 40)
    if (!gone && !e.acked && latchCovers(p.latching.visual, e)) {
      if (!e.latched) {
        e.latched = true;
        e.sounding = latchCovers(p.latching.audible, e);
        s.dirty = true;
      }
      continue;
    }
    delete s.active[id];
    emitAlarm(out, t, e, 'cleared');
    s.dirty = true;
  }
  if (s.dirty || t - s.lastStatusT >= STATUS_EVERY_S - 1e-9) {
    out.push(alarmStatus(s, t));
    s.lastStatusT = t;
    s.dirty = false;
  }
}

/** The renderer's summary (types-device.ts `alarmStatus`). */
export function alarmStatus(s: AlarmMgrState, t: number): Extract<EngineEvent, { type: 'alarmStatus' }> {
  const p = s.profile;
  const limits: Record<string, LimitState> = {};
  for (const [key, d] of Object.entries(p.limits)) {
    const l = limitOf(s, key) as { low: number | null; high: number | null };
    limits[key] = { numeric: d.numeric, low: l.low, high: l.high, enabled: isEnabled(s, key), level: d.level, approximate: d.approximate };
  }
  const groups = Object.values(s.cfg.enabled);
  return {
    type: 'alarmStatus',
    t,
    skin: p.skin,
    ageBand: p.ageBand,
    active: Object.values(s.active).map((e) => ({ ...e })).sort((a, b) => a.level - b.level || a.since - b.since),
    silencedUntil: s.silencedUntil,
    pausedUntil: s.pausedUntil,
    limits,
    allOff: groups.length > 0 && groups.every((v) => !v),
    arrhythmiaAnalysis: s.cfg.arrhythmia,
    volume: s.cfg.volume,
  };
}
