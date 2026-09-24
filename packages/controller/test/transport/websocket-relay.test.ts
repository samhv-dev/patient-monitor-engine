// The WebSocket transport against the REAL relay (ws) on a random port. The relay needs a hello first and
// checks that later frames come from the same `from`, so the pair says hello with the suite's ids.
import { createStamper } from '../../src/protocol.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { startRelay } from '../../relay/server.ts';
import { sleep, waitStatus } from '../helpers.ts';
import { CTL_ID, HOST_ID, SESSION, runTransportConformance } from './conformance.ts';

runTransportConformance('websocket', async () => {
  const relay = await startRelay({ port: 0, host: '127.0.0.1' });
  const url = `ws://127.0.0.1:${relay.port}/`;
  const a = createWebSocketTransport({ url });
  const b = createWebSocketTransport({ url });
  await waitStatus(a, 'open');
  await waitStatus(b, 'open');
  a.send(createStamper(SESSION, HOST_ID)({ kind: 'hello', role: 'host' }));
  await sleep(20);
  b.send(createStamper(SESSION, CTL_ID)({ kind: 'hello', role: 'controller' }));
  await sleep(20);
  return { a, b, cleanup: async () => (a.close(), b.close(), await relay.close()) };
});
