// vent-hamilton.html: the ventilator alone (no ?link) or linked to a monitor in another window/iframe
// (?link=<session>[&profile=<id>]) over BroadcastChannel `pme-vent/<session>`.
import { createBroadcastPort, createVentDriver, monitorMatchedFlow, PROFILES, type ProfileId } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const session = q.get('link');
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const port = session ? createBroadcastPort(session) : null;
const driver = createVentDriver(port, profile);
if (port) {
  // FU-11 (H5): linked to the monitor, VC runs at the monitor ventilator's flow for the set VT and rate (I:E 1:2, no
  // pause) — the same settings deliver the same volume — until the instructor sets Flow or Pause here
  let matched = true;
  addEventListener('input', (e) => {
    const k = (e.target as HTMLElement | null)?.dataset?.key;
    if (k === 'vcFlow' || k === 'pause') matched = false;
  }, true);
  const frame = driver.frame;
  driver.frame = (ms) => {
    if (matched && driver.vs.cfg.mode === 'VC') Object.assign(driver.vs.cfg, monitorMatchedFlow(driver.vs.cfg));
    frame(ms);
  };
}
mountHamiltonUi(driver);
(window as unknown as { __vent: typeof driver }).__vent = driver; // e2e hook
