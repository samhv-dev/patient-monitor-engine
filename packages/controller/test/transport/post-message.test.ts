import { createPostMessageTransport } from '../../src/transport/post-message.ts';
import { runTransportConformance } from './conformance.ts';

runTransportConformance('postMessage', async () => {
  const { port1, port2 } = new MessageChannel();
  const a = createPostMessageTransport(port1);
  const b = createPostMessageTransport(port2);
  return { a, b, cleanup: async () => (a.close(), b.close(), port1.close(), port2.close()) };
});
