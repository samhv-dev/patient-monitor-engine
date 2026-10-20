// Ventilator (research/13 §4.6): the Stage V cockpit beside THIS session's monitor, linked both ways over the Stage V
// link (a direct same-origin frame port since FX-1). The cockpit keeps its own device look inside its frame (research/13 P13). It loads on first
// visit; the link re-attaches when the patient restarts (a new engine).
import type { Command } from '@pme/engine-core';
import { attachMonitorToLink, createFramePort } from '@pme/ventilator';
import { parseRoute } from '../router.ts';
import type { AppSession } from '../session.ts';
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

export function ventView(session: AppSession): View {
  const frame = h('iframe', { class: 'iframe vent', title: 'Ventilator' });
  const el = h('section', { 'aria-label': 'Ventilator' }, frame);
  let started = false;
  const view: View = {
    id: 'vent', el,
    enter: () => {
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      // FX-1: the link to this view's own iframe is a direct same-origin frame port, not BroadcastChannel (on CI's Linux
      // WebKit, messages to the iframe — BroadcastChannel or postMessage — came seconds late or never once the view was
      // hidden: a speed change was lost, and without `clock` messages the cockpit stopped). `&via=parent` tells the cockpit.
      const port = createFramePort(link, () => frame.contentWindow);
      // A NEW patient (patient restart, scenario load) unloads the cockpit. It kept running with the last case's
      // settings and re-attached to every new monitor, so a case run after the Ventilator view had been opened was
      // ventilated by the old cockpit (haemorrhage: pulse lost 10:08 instead of 10:03). The next visit loads a fresh
      // cockpit, as on a fresh page; if the view is on screen it reloads at once.
      let mounts = 0;
      const offReset = session.onMount(() => {
        if (++mounts === 1) return; // the patient the cockpit was opened for
        offReset();
        offAttach();
        offScale();
        detach();
        session.ventLink = null;
        port.close();
        frame.onload = null;
        frame.src = 'about:blank';
        started = false;
        // On screen = the route the URL names NOW, not the last hashchange handled: a restart in the same task as a route
        // change (or ahead of its queued hashchange, as Linux WebKit runs a Playwright call) saw a stale flag and reloaded
        // the cockpit off screen.
        if (parseRoute(location.hash).id === 'vent') queueMicrotask(() => view.enter?.('')); // after the mount loop (a new subscription would be visited by it)
      });
      let detach: () => void = () => {};
      const offAttach = session.onMount((m) => {
        detach();
        const link = attachMonitorToLink(session.linked(m), port, (c, r) => console.warn('vent link rejected', c.type, r));
        detach = link;
        session.ventLink = link; // A fast-forward steps this cockpit with the engine
        // O4 (research/34 §8 O4): the patient starts without the CO2 line; the cockpit ventilating it attaches the line,
        // through the link so a learner monitor mirrors it
        const co2 = (session.last.state as { sensors?: Record<string, string> } | undefined)?.sensors?.co2;
        if (co2 === undefined || co2 === 'off') void session.linked(m).dispatch({ id: `vent-co2-${Date.now()}`, issuedBy: 'device', type: 'attachSensor', sensor: 'co2', state: 'on' } as Command);
      });
      // as the Stage V link page does: once the cockpit has loaded, send it an empty patch (its first control message)
      // and this session's speed
      frame.onload = () => {
        port.post({ v: 1, kind: 'control', patch: {} });
        port.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
      };
      // The cockpit follows every later speed change too — opened at ×1 and then run at ×4 it ventilated at a quarter
      // of the patient's pace (RR 3–7, SpO2 85–89) while its own screen looked normal (presenter rehearsal)
      const offScale = session.onTimeScale((k) => port.post({ v: 1, kind: 'time', action: 'scale', value: k }));
      frame.src = `./vent-hamilton.html?link=${link}&profile=normal&via=parent`;
    },
  };
  return view;
}
