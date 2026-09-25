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
  pausedUntil: number | null;
  lastStatusT: number;
  dirty: boolean;
}

export const LEVEL_PRIORITY: Readonly<Record<AlarmLevel, AlarmPriority>> = { 1: 'high', 2: 'medium', 3: 'low' };
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
  return s.cfg.limits[key] ?? { low: d.low, high: d.high };
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

/** Apply a validated `device alarm` action at sim time t. */
export function applyAlarmAction(s: AlarmMgrState, a: AlarmDeviceAction, t: number, out: EngineEvent[]): void {
  s.dirty = true;
  const p = s.profile;
  switch (a.action) {
    case 'silence': {
      if (s.silencedUntil !== null) {
        s.silencedUntil = null; // pressing Silence again ends it (brief §6.4.1)
        return;
      }
      s.silencedUntil = t + p.silence.durationS;
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
    case 'ack': {
      for (const [id, e] of Object.entries(s.active)) {
        if (e.latched) {
          delete s.active[id];
          emitAlarm(out, t, e, 'cleared');
        } else if (!e.acked) {
          e.acked = true;
          emitAlarm(out, t, e, 'acked');
        }
      }
      return;
    }
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
  for (const c of conds) {
    now.add(c.id);
    if (s.pausedUntil !== null) continue; // pause: nothing is raised (brief §6.4 "Pause stops all alarms")
    const e = s.active[c.id];
    if (e) {
      if (e.latched) {
        e.latched = false; // the condition came back while latched
        s.dirty = true;
      }
      continue;
    }
    const since = (s.pending[c.id] ??= t);
    if (t - since + 1e-9 < c.delayS) continue;
    delete s.pending[c.id];
    const entry: AlarmEntry = { id: c.id, level: c.level, category: c.category, text: c.text, since: t, latched: false, acked: false };
    if (c.numeric) entry.numeric = c.numeric;
    s.active[c.id] = entry;
    if (s.silencedUntil !== null && p.silence.cancelOnNewAlarm) s.silencedUntil = null; // brief §6.4.1: any new alarm ends silence
    emitAlarm(out, t, entry, 'raised');
    s.dirty = true;
  }
  for (const id of Object.keys(s.pending)) if (!now.has(id)) delete s.pending[id];
  for (const [id, e] of Object.entries(s.active)) {
    if (now.has(id)) continue;
    // High-priority physiological alarms latch until acknowledged (brief §6.4 [ENG]); Saadat-like does not latch.
    if (p.latching && e.level === 1 && e.category === 'physiological' && !e.acked) {
      if (!e.latched) {
        e.latched = true;
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
