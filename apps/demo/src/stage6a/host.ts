// Stage 6a host page: the monitor that owns the simulation, the hidden panel (in-process), and the same
// session offered over BroadcastChannel (always) and over the relay + WebRTC (when ?relay= is given).
import {
  acceptWebRtcPeers,
  ControllerSession,
  createBroadcastChannelTransport,
  createInProcessHub,
  createRelaySignaling,
  createWebSocketTransport,
  HOST_SIGNAL_ID,
  HostSession,
  mountInstructorPanel,
  newSessionCode,
  normalizeSessionCode,
  vocabularyOf,
} from '@pme/controller';
import { mountSimMonitor } from './sim-monitor.ts';
import { epochNow, params, relayUrl } from './links.ts';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const session = normalizeSessionCode(params.get('session') ?? '') ?? newSessionCode();
if (params.get('session') !== session) history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), session })}`);
$('code').textContent = session;

const mon = mountSimMonitor($('monitor'), { engine: { seed: 7 }, lanes: ['ecgII', 'V5'] });

// Latency instrumentation (docs/gates/stage-6a.md): receive → dispatch tick → first frame drawing past it.
type Timing = { commandId: string; from: string; receivedAt: number; tick: number; visibleAt: number | null };
const timings: Timing[] = [];
const waiting: Timing[] = [];
mon.onFrame((epoch, renderT) => {
  for (let i = waiting.length - 1; i >= 0; i--) {
    const w = waiting[i] as Timing;
    if (renderT >= w.tick * 0.02) {
      w.visibleAt = epoch;
      waiting.splice(i, 1);
    }
  }
});

const hs = new HostSession({
  session,
  target: mon.host,
  onCommand: (i) => {
    if (!i.accepted) return;
    const t: Timing = { ...i, visibleAt: null };
    timings.push(t);
    waiting.push(t);
  },
});
const hub = createInProcessHub();
hs.addTransport(hub.connect());
hs.addTransport(createBroadcastChannelTransport(session));
const linkNotes: string[] = ['BroadcastChannel'];
if (params.has('relay')) {
  hs.addTransport(createWebSocketTransport({ url: relayUrl() }));
  acceptWebRtcPeers({
    signaling: createRelaySignaling({ url: relayUrl(), session, peerId: HOST_SIGNAL_ID }),
    onTransport: (t) => hs.addTransport(t),
  });
  linkNotes.push(`relay ${relayUrl()}`, 'WebRTC');
}
$('links').textContent = `Links: ${linkNotes.join(' · ')}`;

const panelSession = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'panel' });
const panel = mountInstructorPanel(document.body, {
  session: panelSession,
  vocabulary: vocabularyOf(mon.core.engine),
  sound: { enable: () => mon.enableSound() },
});

const relayQ = params.has('relay') ? `&relay=${encodeURIComponent(relayUrl())}` : '';
const via = params.has('relay') ? 'relay' : 'bc';
$('openRemote').addEventListener('click', () => window.open(`./stage6a-remote.html?session=${session}&via=${via}${relayQ}`, 'pme-remote', 'width=480,height=900'));
$('openViewer').addEventListener('click', () => window.open(`./stage6a-viewer.html?session=${session}&via=${via}${relayQ}`, 'pme-viewer', 'width=1100,height=520'));
$('sound').addEventListener('click', () => void mon.enableSound().then(() => ($('sound').textContent = 'Sound on')));

setInterval(() => {
  const s = hs.stats;
  $('diag').textContent = `t ${mon.core.clock.renderT.toFixed(1)} s · applied ${s.applied} · rejected ${s.rejected} · duplicates ${s.duplicates} · snapshots ${s.snapshotsSent} · panel ${panel.isOpen ? 'open' : 'hidden'}`;
}, 500);

// Latency driver for the in-process path (panel → host), same shape as the remote page's fire().
let nPanel = 0;
async function firePanel() {
  const sentAt = epochNow();
  const r = await panelSession.send({ type: 'setTarget', variable: 'hr', value: 70 + (nPanel++ % 2) * 10 });
  return { commandId: r.commandId, sentAt, ackAt: epochNow(), rttMs: r.rttMs, accepted: r.accepted };
}
Object.assign(window, { __pme6a: { role: 'host', session, hs, mon, panel, timings, firePanel, now: epochNow } });
