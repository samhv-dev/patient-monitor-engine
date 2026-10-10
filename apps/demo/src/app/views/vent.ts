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
  let shown = false; // FU-11 (R50 F10)
  const view: View = {
    id: 'vent', el,
    enter: () => {
      shown = true;
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      const port = createBroadcastPort(link);
      // FU-11 (R50 F10): a NEW patient (patient restart, scenario load) unloads the cockpit. It kept running with the
      // last case's settings and re-attached to every new monitor, so a case run after the Ventilator view had been
      // opened was ventilated by the old cockpit (haemorrhage: pulse lost 10:08 instead of 10:03). The next visit
      // loads a fresh cockpit, as on a fresh page; if the view is on screen it reloads at once.
      let mounts = 0;
      const offReset = session.onMount(() => {
        if (++mounts === 1) return; // the patient the cockpit was opened for
        offReset();
        offAttach();
        offScale();
        detach();
        port.close();
        frame.onload = null;
        frame.src = 'about:blank';
        started = false;
        if (shown) queueMicrotask(() => view.enter?.('')); // after the mount loop (a new subscription would be visited by it)
      });
      let detach: () => void = () => {};
      const offAttach = session.onMount((m) => {
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
    leave: () => {
      shown = false;
    },
  };
  return view;
}
