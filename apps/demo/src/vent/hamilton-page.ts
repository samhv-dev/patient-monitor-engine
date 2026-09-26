// vent-hamilton.html: the ventilator alone (no ?link) or linked to a monitor in another window/iframe
// (?link=<session>[&profile=<id>]) over BroadcastChannel `pme-vent/<session>`.
import { createBroadcastPort, createVentDriver, PROFILES, type ProfileId } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const session = q.get('link');
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const port = session ? createBroadcastPort(session) : null;
const driver = createVentDriver(port, profile);
mountHamiltonUi(driver);
(window as unknown as { __vent: typeof driver }).__vent = driver; // e2e hook
