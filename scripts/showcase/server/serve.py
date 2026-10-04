# Offline showcase kit: last-resort static server on the standard library's http.server (used only when a real
# python3 is installed; the launcher never touches the /usr/bin/python3 install stub).
# Usage: python3 serve.py ROOT START_PORT PORT_FILE
#   Binds 127.0.0.1 only, tries START_PORT and the next 49 ports, writes the port it got into PORT_FILE.
import functools
import http.server
import os
import signal
import sys

root, start_port, port_file = sys.argv[1], int(sys.argv[2]), sys.argv[3]


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
        '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def list_directory(self, path):  # never list folders
        self.send_error(404)
        return None

    def log_message(self, *args):
        pass


server = None
for p in range(start_port, start_port + 50):
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', p), functools.partial(Handler, directory=root))
        break
    except OSError:
        continue
if server is None:
    sys.exit('no free port from %d' % start_port)

with open(port_file + '.tmp', 'w') as f:
    f.write('%d\n' % server.server_address[1])
os.rename(port_file + '.tmp', port_file)
for s in (signal.SIGTERM, signal.SIGHUP):
    signal.signal(s, lambda *_: sys.exit(0))
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
