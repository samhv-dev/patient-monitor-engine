import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { runTransportConformance } from './conformance.ts';

let n = 0;
runTransportConformance('broadcastChannel', async () => {
  const session = `TEST${String(++n).padStart(2, '2')}`; // a fresh channel per test
  const a = createBroadcastChannelTransport(session);
  const b = createBroadcastChannelTransport(session);
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});
