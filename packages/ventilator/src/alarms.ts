// Ventilator alarms: v1.9's banner rules (syncHeader), in the same priority order, plus two Stage V alarms the
// link needs — `disconnection` (a delivered breath that raised no pressure) and `apnea` (no breath for the set
// apnoea time; the v1.9 setting existed but was never wired).
// The EDP-TS alarms (plan vent-skin-edp-ts.md V3) follow, each evaluated only when its optional limit is in the cfg
// (types.ts), so a v1.9 configuration's list is exactly v1.9's. They are conditions, raised the moment they hold: how
// long a condition must last before the device signals it is the face's alarm profile (the cockpit core's alarm view).
import type { AlarmObs, VentAlarm, VentState } from './types.ts';

export function ventAlarms(vs: VentState, obs: AlarmObs = {}): VentAlarm[] {
  const c = vs.cfg;
  const p = vs.p;
  const m = p.shown ?? p.measured;
  const out: VentAlarm[] = [];
  const add = (id: VentAlarm['id'], text: string, priority: VentAlarm['priority'] = 'high') => out.push({ id, text, priority });
  if (vs.circuit === 'disconnected' && p.breathCount > 0 && m.PIP < c.peep + 2) add('disconnection', 'Disconnection on patient side'); // Stage V
  if (p.t - vs.lastBreathT > c.apneaTime) add('apnea', 'Apnea'); // Stage V
  if (m.PIP >= c.pmax) add('pmax', 'High pressure (Pmax)');
  if (m.MV > c.almMVhi) add('mvHigh', 'ExpMinVol high');
  if (m.VTE > 0 && m.MV < c.almMVlo) add('mvLow', 'ExpMinVol low');
  if (m.VTE > c.almVThi) add('vtHigh', 'Vt high');
  if (m.VTE > 0 && m.VTE < c.almVTlo) add('vtLow', 'Vt low');
  if (m.RR > c.almFhi) add('fHigh', 'fTotal high');
  if (m.RR > 3 && m.RR < c.almFlo) add('fLow', 'fTotal low');
  if (m.autoPEEP > 5) add('intrinsicPeep', 'Intrinsic PEEP', 'medium');
  // EDP-TS (research/57 A-31, A-35, A-44, A-49); the texts are the model's, a face shows its own words
  if (c.almContHiP !== undefined && p.Paw > c.peep + c.almContHiP) add('contHighPressure', 'Continuous high pressure');
  if (c.almPlo !== undefined && p.breathCount > 0 && m.PIP < c.almPlo) add('lowPressure', 'Low pressure');
  if (c.almPeepHi !== undefined && obs.peepEnd !== undefined && obs.peepEnd > c.almPeepHi) add('highPeep', 'High PEEP', 'medium');
  if (c.almO2hi !== undefined && c.fio2 > c.almO2hi) add('o2High', 'High O2 concentration', 'medium');
  if (c.almO2lo !== undefined && c.fio2 < c.almO2lo) add('o2Low', 'Low O2 concentration', 'medium');
  return out;
}

/** The banner text: silenced countdown, the first active alarm, or none (v1.9). */
export function bannerText(vs: VentState): { cls: '' | 'armed' | 'silenced'; text: string } {
  if (vs.silenceUntil > vs.p.t) return { cls: 'silenced', text: `alarms silenced — ${Math.ceil(vs.silenceUntil - vs.p.t)} s` };
  const a = ventAlarms(vs)[0];
  return a ? { cls: 'armed', text: `⚠ ${a.text}` } : { cls: '', text: 'No active alarms' };
}
