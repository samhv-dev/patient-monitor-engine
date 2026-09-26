// Ventilator alarms: v1.9's banner rules (syncHeader), in the same priority order, plus two Stage V alarms the
// link needs — `disconnection` (a delivered breath that raised no pressure) and `apnea` (no breath for the set
// apnoea time; the v1.9 setting existed but was never wired).
import type { VentAlarm, VentState } from './types.ts';

export function ventAlarms(vs: VentState): VentAlarm[] {
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
  return out;
}

/** The banner text: silenced countdown, the first active alarm, or none (v1.9). */
export function bannerText(vs: VentState): { cls: '' | 'armed' | 'silenced'; text: string } {
  if (vs.silenceUntil > vs.p.t) return { cls: 'silenced', text: `alarms silenced — ${Math.ceil(vs.silenceUntil - vs.p.t)} s` };
  const a = ventAlarms(vs)[0];
  return a ? { cls: 'armed', text: `⚠ ${a.text}` } : { cls: '', text: 'No active alarms' };
}
