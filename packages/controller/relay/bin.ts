#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// pme-relay: the @pme/controller WebSocket relay (brief §3.7). Usage: pme-relay [--port 8787] [--host 0.0.0.0]
//   [--room-ttl-min 10] [--quiet] [--static DIR] [--max-peers 60] [--remote-roles viewer|all].
//   Runs on Node ≥ 22.12 with type stripping (no build step).
// Stage 12 (the classroom): `--static DIR` also serves the built app on the same port, so learners' phones open
// http://<this laptop>:<port>/?join=CODE. Other devices may only FOLLOW, or sign in as the instructor's phone with the
// PIN (`--remote-roles viewer`, the default with or without `--static`: plan instructor-peer-role.md Q12(b), a relay
// started by hand is no weaker than the classroom's); `--remote-roles all` lets any device that knows the code command.
import { parseArgs } from 'node:util';
import { lanAddresses } from './http.ts';
import { startRelay } from './server.ts';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((a) => a !== '--'), // `pnpm relay -- --port 9000` passes the '--' through
  options: {
    port: { type: 'string', default: '8787' },
    host: { type: 'string', default: '0.0.0.0' },
    'room-ttl-min': { type: 'string', default: '10' },
    quiet: { type: 'boolean', default: false },
    static: { type: 'string' },
    'max-peers': { type: 'string', default: '60' },
    'remote-roles': { type: 'string' },
  },
});
const roles = values['remote-roles'] ?? 'viewer';
if (roles !== 'viewer' && roles !== 'all') throw new Error('--remote-roles must be viewer or all');
const relay = await startRelay({
  port: Number(values.port),
  host: values.host,
  roomTtlMs: Number(values['room-ttl-min']) * 60_000,
  maxPeersPerRoom: Number(values['max-peers']),
  remoteRoles: roles,
  ...(values.static ? { staticDir: values.static } : {}),
  ...(values.quiet ? {} : { log: (l: string) => console.log(`[pme-relay] ${l}`) }),
});
console.log(`pme-relay ready on ws://${values.host}:${relay.port}/ (Ctrl+C to stop)`);
if (values.static) {
  console.log(`  instructor (this computer): http://127.0.0.1:${relay.port}/?relay#/`);
  for (const a of lanAddresses()) console.log(`  learners' phones reach it at: http://${a}:${relay.port}/`);
}
const stop = () => void relay.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
