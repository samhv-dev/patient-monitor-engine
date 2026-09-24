// Stage 6a remote controller page (phone/tablet). Never renders waveforms.
import { createEngine } from '@pme/engine-core';
import { mountRemote, vocabularyOf, type CommandInput } from '@pme/controller';
import { connect, epochNow, params, viaParam } from './links.ts';

const first = viaParam();
const remote = mountRemote(document.getElementById('remote') as HTMLElement, {
  vocabulary: vocabularyOf(createEngine()), // same build as the host; Stage 5's engine vocabulary() flows through
  vias: [first, ...(['broadcastChannel', 'websocket', 'webrtc'] as const).filter((v) => v !== first)],
  connect,
  ...(params.get('session') ? { session: params.get('session') as string } : {}),
  autoJoin: true,
});

// Latency driver for docs/gates/stage-6a.md: send one command, report send/ack wall times (epoch ms).
let n = 0;
async function fire(): Promise<{ commandId: string; sentAt: number; ackAt: number; rttMs: number; accepted: boolean }> {
  const s = remote.session;
  if (!s) throw new Error('not joined');
  const cmd: CommandInput = { type: 'setTarget', variable: 'hr', value: 70 + (n++ % 2) * 10 };
  const sentAt = epochNow();
  const r = await s.send(cmd);
  return { commandId: r.commandId, sentAt, ackAt: epochNow(), rttMs: r.rttMs, accepted: r.accepted };
}
Object.assign(window, { __pme6a: { role: 'remote', remote, fire } });
