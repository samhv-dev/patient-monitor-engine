// Defibrillator (brief §6.5 table; research/05 §2.6): energy select, charge with a charge time and tone, ready,
// auto-disarm, sync mode. Shock delivery (artefact, outcome) is in device-layer.ts because it touches the patient.
import type { DefibEvent } from '../../types-device.ts';
import type { EngineEvent, RhythmId } from '../../types.ts';
import { RHYTHMS } from '../../l2/ecg/rhythms.ts';
import type { DeviceProfile } from '../alarms/profile.ts';

export type DefibSpec = NonNullable<DeviceProfile['defib']>;
/** Skins without a defibrillator (saadat-like, philips-like: bedside monitors) still accept shocks as patient
 * commands (brief §6.5 saadat-like note); they use these ZOLL-like values (research/05 §2.6) [ENG choice]. */
export const FALLBACK_DEFIB: DefibSpec = { energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: null, chargeTimeS: null, readyTimeoutS: 60, toneSet: 'zoll-like' };
/** Charge time when a skin publishes none: LIFEPAK-like 200 J ≤ 7 s scaled linearly (research/05 §2.6) [ENG]. */
export const CHARGE_S_PER_J = 7 / 200;
export const ENERGY_RANGE_J = [1, 360] as const;

export interface DefibState {
  energyJ: number;
  state: 'idle' | 'charging' | 'ready';
  readyAt: number | null;
  disarmAt: number | null;
  sync: boolean;
  /** Shock pressed in sync mode, waiting for the next R. */
  syncArmed: boolean;
  shocks: number;
  seq: number;
  preselect: RhythmId | 'unchanged' | null;
  lastShock: { t: number; energyJ: number; sync: boolean; outcome: string } | null;
}

export function createDefib(spec: DefibSpec): DefibState {
  return { energyJ: spec.energyAdultJ, state: 'idle', readyAt: null, disarmAt: null, sync: false, syncArmed: false, shocks: 0, seq: 0, preselect: null, lastShock: null };
}

/** Charge time (s) for an energy: the skin's table interpolated (proportional below its first point, clamped above). */
export function chargeTimeS(spec: DefibSpec, energyJ: number): number {
  const pts = Object.entries(spec.chargeTimeS ?? {}).map(([j, s]) => [Number(j), s] as const).sort((a, b) => a[0] - b[0]);
  if (pts.length === 0) return energyJ * CHARGE_S_PER_J;
  const [j0, s0] = pts[0] as readonly [number, number];
  if (energyJ <= j0) return (s0 * energyJ) / j0;
  for (let i = 1; i < pts.length; i++) {
    const [ja, sa] = pts[i - 1] as readonly [number, number];
    const [jb, sb] = pts[i] as readonly [number, number];
    if (energyJ <= jb) return sa + ((sb - sa) * (energyJ - ja)) / (jb - ja);
  }
  return (pts[pts.length - 1] as readonly [number, number])[1];
}

export function validateDefib(d: DefibState, ev: DefibEvent): string | undefined {
  switch (ev.action) {
    case 'selectEnergy':
      return ev.energyJ !== undefined && Number.isFinite(ev.energyJ) && ev.energyJ >= ENERGY_RANGE_J[0] && ev.energyJ <= ENERGY_RANGE_J[1] ? undefined : 'energyJ must be 1–360 J';
    case 'charge':
      return ev.energyJ === undefined || (Number.isFinite(ev.energyJ) && ev.energyJ >= ENERGY_RANGE_J[0] && ev.energyJ <= ENERGY_RANGE_J[1]) ? undefined : 'energyJ must be 1–360 J';
    case 'shock':
      return d.state === 'ready' ? undefined : 'defibrillator is not charged';
    case 'preselect':
      return ev.outcome === 'unchanged' || (ev.outcome !== undefined && ev.outcome in RHYTHMS) ? undefined : "outcome must be a rhythm id or 'unchanged'";
    case 'disarm':
    case 'syncOn':
    case 'syncOff':
      return undefined;
    default:
      return `unknown defib action ${String((ev as { action: string }).action)}`;
  }
}

/** Apply a validated action. Returns 'shock' when an unsynchronised shock must be delivered now. */
export function applyDefib(d: DefibState, ev: DefibEvent, t: number, spec: DefibSpec, out: EngineEvent[]): 'shock' | null {
  switch (ev.action) {
    case 'selectEnergy':
      d.energyJ = ev.energyJ as number;
      if (d.state !== 'idle') disarm(d, t, out, false);
      return null;
    case 'charge': {
      if (ev.energyJ !== undefined) d.energyJ = ev.energyJ;
      const chargeS = chargeTimeS(spec, d.energyJ);
      d.state = 'charging';
      d.readyAt = t + chargeS;
      d.disarmAt = null;
      d.syncArmed = false;
      out.push({ type: 'marker', t, kind: 'chargeStart', data: { energyJ: d.energyJ } });
      out.push({ type: 'tone', t, id: `defib-charge-${++d.seq}`, kind: 'charge', chargeS });
      return null;
    }
    case 'shock':
      if (d.sync) {
        d.syncArmed = true; // delivered on the next detected R (device-layer.ts)
        return null;
      }
      return 'shock';
    case 'disarm':
      disarm(d, t, out, false);
      return null;
    case 'syncOn':
      d.sync = true;
      return null;
    case 'syncOff':
      d.sync = false;
      d.syncArmed = false;
      return null;
    case 'preselect':
      d.preselect = ev.outcome as RhythmId | 'unchanged';
      return null;
  }
}

function disarm(d: DefibState, t: number, out: EngineEvent[], auto: boolean): void {
  d.state = 'idle';
  d.readyAt = null;
  d.disarmAt = null;
  d.syncArmed = false;
  out.push({ type: 'marker', t, kind: 'disarm', data: { auto } });
}

/** Timed transitions: charging → ready (marker + ready tone), ready → auto-disarm after readyTimeoutS. */
export function stepDefib(d: DefibState, t: number, spec: DefibSpec, out: EngineEvent[]): boolean {
  if (d.state === 'charging' && d.readyAt !== null && t >= d.readyAt - 1e-9) {
    d.state = 'ready';
    d.disarmAt = d.readyAt + spec.readyTimeoutS;
    out.push({ type: 'marker', t, kind: 'chargeReady', data: { energyJ: d.energyJ } });
    out.push({ type: 'tone', t, id: `defib-ready-${++d.seq}`, kind: 'chargeReady' });
    return true;
  }
  if (d.state === 'ready' && d.disarmAt !== null && t >= d.disarmAt - 1e-9) {
    disarm(d, t, out, true);
    return true;
  }
  return false;
}

/** After a delivered shock (brief §6.5: LIFEPAK-like "Sync After Shock" off; applied to every skin [ENG]). */
export function afterShock(d: DefibState, t: number, atS: number, synced: boolean, outcome: string, out: EngineEvent[]): void {
  out.push({ type: 'marker', t, kind: 'shock', data: { energyJ: d.energyJ, sync: synced, atS } });
  out.push({ type: 'tone', t, id: `defib-shock-${++d.seq}`, kind: 'shock' });
  d.lastShock = { t, energyJ: d.energyJ, sync: synced, outcome };
  d.state = 'idle';
  d.readyAt = null;
  d.disarmAt = null;
  d.syncArmed = false;
  d.sync = false;
  d.shocks++;
  d.preselect = null;
}
