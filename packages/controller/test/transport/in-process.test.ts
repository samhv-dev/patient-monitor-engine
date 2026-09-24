import { createInProcessHub } from '../../src/transport/in-process.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('in-process', async () => {
  const hub = createInProcessHub();
  const a = hub.connect();
  const b = hub.connect();
  return { a, b, cleanup: async () => (a.close(), b.close()) };
});
