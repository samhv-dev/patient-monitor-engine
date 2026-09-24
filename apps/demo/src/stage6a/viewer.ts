// Stage 6a viewer page: a second monitor (projector) that synthesises its trace locally from the host's
// snapshot + mirrored commands (ViewerSync). No samples ever arrive.
import { normalizeSessionCode, ViewerSync } from '@pme/controller';
import { mountSimMonitor } from './sim-monitor.ts';
import { connect, params, viaParam } from './links.ts';

const diag = document.getElementById('diag') as HTMLElement;
const session = normalizeSessionCode(params.get('session') ?? '');
if (!session) {
  diag.textContent = 'Add ?session=ABC234 to the URL (the code shown on the host monitor).';
  throw new Error('no session');
}
const mon = mountSimMonitor(document.getElementById('monitor') as HTMLElement, { engine: { seed: 1 }, lanes: ['ecgII', 'V5'] });
const transport = connect(session, viaParam());
const sync = new ViewerSync({ session, transport, target: mon.viewer, engineVersion: mon.core.engine.version });
mon.onFrame(() => sync.follow());
setInterval(() => {
  diag.textContent = `viewer ${session} · link ${transport.kind} ${transport.status} · ${sync.status} · lag ${(sync.lagS * 1000).toFixed(0)} ms · beat drift ${sync.beatDriftMs.toFixed(1)} ms · resyncs ${sync.resyncs}`;
}, 500);
Object.assign(window, { __pme6a: { role: 'viewer', sync, mon } });
