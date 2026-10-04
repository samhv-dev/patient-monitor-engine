// Offline showcase kit: a static file server for the bundled Node runtime (node:http only, no packages).
// Usage: node serve.mjs ROOT START_PORT PORT_FILE
//   Binds 127.0.0.1 only, tries START_PORT and the next 49 ports, writes the port it got into PORT_FILE.
//   GET and HEAD; path traversal refused; MIME types for everything the built app uses.
import { createReadStream, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const [rootArg, startPortArg, portFile] = process.argv.slice(2);
if (!portFile) {
  console.error('usage: node serve.mjs ROOT START_PORT PORT_FILE');
  process.exit(2);
}
const root = realpathSync(rootArg);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};

const send = (res, code, text, head) => {
  res.writeHead(code, { 'Content-Type': 'text/plain', 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-cache' });
  res.end(head ? undefined : text);
};

const server = createServer((req, res) => {
  const head = req.method === 'HEAD';
  if (req.method !== 'GET' && !head) return send(res, 405, 'Only GET and HEAD\n', false);
  let path;
  try {
    path = decodeURIComponent((req.url ?? '/').replace(/[?#].*$/s, ''));
  } catch {
    return send(res, 400, 'Bad request\n', head);
  }
  if (!path.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(path) || /[\\\0]/.test(path)) return send(res, 403, 'Forbidden\n', head);
  let file = join(root, path);
  if (path.endsWith('/')) file = join(file, 'index.html');
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const real = realpathSync(file);
    const st = statSync(real);
    if (!real.startsWith(root + '/') || !st.isFile()) return send(res, 404, 'Not found\n', head);
    res.writeHead(200, {
      'Content-Type': MIME[extname(real).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    });
    if (head) return res.end();
    createReadStream(real).on('error', () => res.destroy()).pipe(res);
  } catch {
    send(res, 404, 'Not found\n', head);
  }
});

const start = Number(startPortArg);
let port = start;
server.on('error', (e) => {
  if ((e.code === 'EADDRINUSE' || e.code === 'EACCES') && port < start + 49) server.listen(++port, '127.0.0.1');
  else {
    console.error(`cannot listen: ${e.message}`);
    process.exit(1);
  }
});
server.on('listening', () => {
  writeFileSync(`${portFile}.tmp`, `${port}\n`);
  renameSync(`${portFile}.tmp`, portFile);
});
for (const s of ['SIGTERM', 'SIGHUP', 'SIGINT']) process.on(s, () => process.exit(0));
server.listen(port, '127.0.0.1');
