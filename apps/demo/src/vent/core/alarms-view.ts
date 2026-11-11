// The cockpit core's alarm view (plan vent-skin-edp-ts.md §4.3, piece V3): a face's alarm profile applied to the
// model's alarm CONDITIONS (ventAlarms), stepped on sim time so a test drives it with the driver's clock. Pure: it owns
// only its per-alarm state and knows no look. What it does is the EDP-TS manual's alarm chapter (research/57):
// - a condition is signalled once it has held for its delay without a break (A-31, A-34, A-40 to A-44, A-49, A-50);
//   one that ends sooner leaves nothing behind;
// - while signalled it is ACTIVE: its lamp flashes (high fast, medium slow; low steady: H-06), it may be the message;
// - when its cause ends the message goes at once (A-19); a latching alarm's lamp stays lit, steady, until Esc resets
//   the lamps of the alarms that have ended (A-15, A-16, H-25);
// - one message: the highest active priority (A-03, the alarm chapter's rule, VQ7), between equals the profile's order;
// - one tone: the highest active priority sounds (A-09); silence pauses the audio only (A-20): lamps and message stay.
// Raised and ended events, with their times, are what the device's record of activated alarms keeps (A-07; V13).
import type { VentAlarm, VentConfig } from '@pme/ventilator';
import type { AlarmProfile } from './types.ts';

type Id = VentAlarm['id'];
type Priority = VentAlarm['priority'];

export interface AlarmSignal {
  id: Id;
  priority: Priority;
  /** Sim time it was signalled (after its delay), s. */
  since: number;
  /** true: its condition holds now; false: it ended and its lamp is latched until Esc. */
  active: boolean;
}
export interface AlarmSignals {
  /** The one message the screen shows, or null. */
  message: { id: Id; priority: Priority } | null;
  /** The priority whose tone sounds (the highest active), or null; silence does not change it (see `silencedS`). */
  sounding: Priority | null;
  lamps: { high: 'off' | 'fast' | 'steady'; medLow: 'off' | 'slow' | 'steady' };
  /** Every alarm signalled or latched, in the profile's order. */
  signals: AlarmSignal[];
  /** Seconds of audio silence left, 0 when none. */
  silencedS: number;
}
export interface AlarmEvent { t: number; id: Id; priority: Priority; kind: 'raised' | 'ended' }

export interface AlarmView {
  /** One step of sim time `t` with the model's conditions now. */
  step(t: number, raw: readonly VentAlarm[], cfg: Readonly<VentConfig>): void;
  signals(t: number): AlarmSignals;
  /** Esc: reset the latched lamps of the alarms that have ended; true when one was reset. */
  esc(): boolean;
  /** The silence key pressed at `t`: the seconds of silence from `t` it gives. */
  silence(t: number): number;
  onEvent(fn: (e: AlarmEvent) => void): () => void;
}

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function createAlarmView(prof: AlarmProfile): AlarmView {
  const order = new Map<Id, number>((prof.show ?? []).map((id, i) => [id, i]));
  const latching = new Set(prof.latch ?? []);
  const silenceS = prof.silenceS ?? [];
  /** Condition holding since (not yet signalled). */
  const pending = new Map<Id, number>();
  const sig = new Map<Id, AlarmSignal>();
  const subs = new Set<(e: AlarmEvent) => void>();
  let lastT = -Infinity;
  let silFrom = -Infinity, silUntil = -Infinity, presses = 0;
  const emit = (e: AlarmEvent) => { for (const fn of [...subs]) fn(e); };
  const pri = (a: VentAlarm): Priority => prof.priority?.[a.id] ?? a.priority;
  const sorted = () => [...sig.values()].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return {
    step(t, raw, cfg) {
      if (t < lastT) { pending.clear(); sig.clear(); silFrom = silUntil = -Infinity; presses = 0; } // a new run
      lastT = t;
      const now = new Map<Id, VentAlarm>();
      for (const a of raw) if (order.has(a.id) && (prof.enabled?.[a.id]?.(cfg) ?? true)) now.set(a.id, a);
      for (const [id, a] of now) {
        const s = sig.get(id);
        if (s?.active) continue;
        const from = pending.get(id) ?? t;
        pending.set(id, from);
        if (t - from >= (prof.delayS?.[id] ?? 0) - 1e-9) {
          pending.delete(id);
          const x: AlarmSignal = { id, priority: pri(a), since: t, active: true };
          sig.set(id, x);
          emit({ t, id, priority: x.priority, kind: 'raised' });
        }
      }
      for (const id of [...pending.keys()]) if (!now.has(id)) pending.delete(id);
      for (const [id, s] of sig) {
        if (!s.active || now.has(id)) continue;
        if (latching.has(id)) s.active = false;
        else sig.delete(id);
        emit({ t, id, priority: s.priority, kind: 'ended' });
      }
    },
    signals(t) {
      const all = sorted();
      const act = all.filter((s) => s.active);
      const top = [...act].sort((a, b) => RANK[a.priority] - RANK[b.priority])[0] ?? null; // stable: the profile's order between equals
      const has = (f: (s: AlarmSignal) => boolean) => all.some(f);
      return {
        message: top && { id: top.id, priority: top.priority },
        sounding: top?.priority ?? null,
        lamps: {
          high: has((s) => s.active && s.priority === 'high') ? 'fast' : has((s) => s.priority === 'high') ? 'steady' : 'off',
          medLow: has((s) => s.active && s.priority === 'medium') ? 'slow' : has((s) => s.priority !== 'high') ? 'steady' : 'off',
        },
        signals: all.map((s) => ({ ...s })),
        silencedS: Math.max(0, silUntil - t),
      };
    },
    esc() {
      let any = false;
      for (const [id, s] of sig) if (!s.active) { sig.delete(id); any = true; }
      return any;
    },
    silence(t) {
      if (!silenceS.length) return 0;
      if (t < silUntil && presses < silenceS.length) presses++;
      else if (t >= silUntil) { presses = 1; silFrom = t; }
      silUntil = silFrom + (silenceS[presses - 1] as number);
      return silUntil - t;
    },
    onEvent: (fn) => (subs.add(fn), () => void subs.delete(fn)),
  };
}
