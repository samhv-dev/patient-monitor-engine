#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// pme-relay: the @pme/controller WebSocket relay (brief §3.7). Usage: pme-relay [--port 8787] [--host 0.0.0.0]
//   [--room-ttl-min 10] [--quiet]. Runs on Node ≥ 22.12 with type stripping (no build step).
import { parseArgs } from 'node:util';
import { startRelay } from './server.ts';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'), // `pnpm relay -- --port 9000` passes the '--' through
  options: {
    port: { type: 'string', default: '8787' },
    host: { type: 'string', default: '0.0.0.0' },
    'room-ttl-min': { type: 'string', default: '10' },
    quiet: { type: 'boolean', default: false },
  },
});
const relay = await startRelay({
  port: Number(values.port),
  host: values.host,
  roomTtlMs: Number(values['room-ttl-min']) * 60_000,
  ...(values.quiet ? {} : { log: (l: string) => console.log(`[pme-relay] ${l}`) }),
});
console.log(`pme-relay ready on ws://${values.host}:${relay.port}/ (Ctrl+C to stop)`);
const stop = () => void relay.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
