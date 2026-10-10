// Ventilator (research/13 §4.6): the Stage V cockpit beside THIS session's monitor, linked both ways over the Stage V
// BroadcastChannel port. The cockpit keeps its own device look inside its frame (research/13 P13). It loads on first
// visit; the link re-attaches when the patient restarts (a new engine).
import { attachMonitorToLink, createBroadcastPort } from '@pme/ventilator';
import type { AppSession } from '../session.ts';
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

export function ventView(session: AppSession): View {
  const frame = h('iframe', { class: 'iframe vent', title: 'Ventilator' });
  const el = h('section', { 'aria-label': 'Ventilator' }, frame);
  let started = false;
  return {
    id: 'vent', el,
    enter: () => {
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      const port = createBroadcastPort(link);
      let detach: () => void = () => {};
      session.onMount((m) => {
        detach();
        detach = attachMonitorToLink(m, port, (c, r) => console.warn('vent link rejected', c.type, r));
      });
      // as the Stage V link page does: once the cockpit has loaded, send it an empty patch (its first control message)
      // and this session's speed
      frame.onload = () => {
        port.post({ v: 1, kind: 'control', patch: {} });
        port.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
      };
      // FU-11 (D3, presenter rehearsal): the cockpit follows every later speed change too — opened at ×1 and then run at
      // ×4 it ventilated at a quarter of the patient's pace (RR 3–7, SpO2 85–89) while its own screen looked normal
      const offScale = session.onTimeScale((k) => port.post({ v: 1, kind: 'time', action: 'scale', value: k }));
      frame.src = `./vent-hamilton.html?link=${link}&profile=normal`;
    },
  };
}
