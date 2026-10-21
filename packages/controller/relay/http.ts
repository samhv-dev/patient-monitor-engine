// Stage 12 (the classroom): the relay's HTTP side on the WebSocket's own port. Learners' phones cannot use the
// instructor's BroadcastChannel and a page served over https cannot open a ws:// socket (mixed content), so in a
// classroom the relay also serves the BUILT app (`--static DIR`) over plain http on the venue network: the phone opens
// one address, and the page's relay is that same address. `/pme-relay.json` tells the instructor's page the laptop's
// network addresses for the QR code (the page itself may run on 127.0.0.1). GET and HEAD only; path traversal refused.
import { createReadStream, realpathSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, isAbsolute, join, relative, sep } from 'node:path';

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};

/** Interfaces phones are most likely on, first: this computer's own hotspot (macOS Internet Sharing: bridge*; Windows
 *  Mobile hotspot: "Local Area Connection* N"), then Wi-Fi or Ethernet (macOS en*; Windows "Wi-Fi", "WLAN", "Ethernet N"),
 *  then the rest, and last the virtual adapters Windows lists early (Hyper-V and WSL "vEthernet (...)", VirtualBox,
 *  VMware, Bluetooth): without that, a Windows QR code could point at a virtual switch no phone can reach. */
const rank = (name: string): number =>
  /^bridge|^Local Area Connection\*/.test(name) ? 0 : /^en/.test(name) || /^(Wi-?Fi|WLAN|Ethernet)/i.test(name) ? 1 : /^(vEthernet|VirtualBox|VMware|Bluetooth)/i.test(name) ? 3 : 2;

/** `file` lies inside the folder `root` (both real paths). A '/' prefix test is not enough: on Windows the separator is
 *  '\\', and that test refused every file of the app. `p` is node:path's own functions; a test passes `path.win32`. */
export function isInside(root: string, file: string, p: { relative: typeof relative; isAbsolute: typeof isAbsolute; sep: string } = { relative, isAbsolute, sep }): boolean {
  const r = p.relative(root, file);
  return r !== '' && r !== '..' && !r.startsWith(`..${p.sep}`) && !p.isAbsolute(r);
}

/** This machine's IPv4 addresses another device can reach, best first (no loopback, no link-local 169.254/16). */
export function lanAddresses(ifs: ReturnType<typeof networkInterfaces> = networkInterfaces()): string[] {
  const out: Array<{ address: string; r: number }> = [];
  for (const [name, list] of Object.entries(ifs)) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ address: a.address, r: rank(name) });
  return out.sort((a, b) => a.r - b.r).map((a) => a.address);
}

/** A socket from this machine itself (loopback, or one of its own interface addresses): the instructor's laptop. */
export function isLocalAddress(addr: string | undefined, ifs: ReturnType<typeof networkInterfaces> = networkInterfaces()): boolean {
  if (!addr) return false;
  const a = addr.replace(/^::ffff:/, '');
  if (a === '::1' || a.startsWith('127.')) return true;
  return Object.values(ifs).some((list) => (list ?? []).some((i) => i.address === a));
}

/** What `/pme-relay.json` answers (the instructor's page reads it for the QR code). */
export interface RelayInfo {
  relay: 'pme';
  port: number;
  /** IPv4 addresses of this machine on its networks, best first (en0-style Wi-Fi before bridges). */
  addresses: string[];
  /** The relay serves the app itself: a learner's address is http://<address>:<port>/. */
  serves: boolean;
}

export function httpHandler(o: { staticDir?: string; info: () => RelayInfo }): (req: IncomingMessage, res: ServerResponse) => void {
  const root = o.staticDir ? realpathSync(o.staticDir) : null;
  const text = (res: ServerResponse, code: number, body: string, head: boolean) => {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache' });
    res.end(head ? undefined : body);
  };
  return (req, res) => {
    const head = req.method === 'HEAD';
    if (req.method !== 'GET' && !head) return text(res, 405, 'Only GET and HEAD\n', false);
    let path: string;
    try {
      path = decodeURIComponent((req.url ?? '/').replace(/[?#].*$/s, ''));
    } catch {
      return text(res, 400, 'Bad request\n', head);
    }
    if (path === '/pme-relay.json') {
      const body = JSON.stringify(o.info());
      // the instructor's page may come from another origin (a dev server); the answer holds no secret
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      return res.end(head ? undefined : body);
    }
    if (!root) return text(res, 404, 'pme-relay: no app here (start it with --static <built app folder>)\n', head);
    if (!path.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(path) || /[\\\0]/.test(path)) return text(res, 403, 'Forbidden\n', head);
    let file = join(root, path);
    try {
      if (path.endsWith('/') || statSync(file).isDirectory()) file = join(file, 'index.html');
      const real = realpathSync(file);
      const st = statSync(real);
      if (!isInside(root, real) || !st.isFile()) return text(res, 404, 'Not found\n', head);
      res.writeHead(200, { 'Content-Type': MIME[extname(real).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (head) return res.end();
      createReadStream(real).on('error', () => res.destroy()).pipe(res);
    } catch {
      text(res, 404, 'Not found\n', head);
    }
  };
}
