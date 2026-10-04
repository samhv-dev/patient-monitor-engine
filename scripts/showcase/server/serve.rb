# Offline showcase kit: a static file server on WEBrick (bundled with macOS's /usr/bin/ruby 2.6).
# Usage: ruby serve.rb ROOT START_PORT PORT_FILE
#   Binds 127.0.0.1 only, tries START_PORT and the next 49 ports, writes the port it got into PORT_FILE.
#   WEBrick's file handler answers GET and HEAD and refuses paths outside the root.
require 'webrick'

root, start_port, port_file = ARGV
abort 'usage: serve.rb ROOT START_PORT PORT_FILE' unless port_file
root = File.realpath(root)

mime = WEBrick::HTTPUtils::DefaultMimeTypes.merge(
  'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8',
  'mjs' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
  'json' => 'application/json; charset=utf-8', 'map' => 'application/json; charset=utf-8',
  'wasm' => 'application/wasm', 'svg' => 'image/svg+xml', 'png' => 'image/png',
  'woff2' => 'font/woff2', 'woff' => 'font/woff', 'txt' => 'text/plain; charset=utf-8'
)

server = nil
port = nil
(start_port.to_i..start_port.to_i + 49).each do |p|
  begin
    server = WEBrick::HTTPServer.new(
      BindAddress: '127.0.0.1', Port: p, DocumentRoot: root, MimeTypes: mime,
      DirectoryIndex: ['index.html'], DoNotReverseLookup: true,
      Logger: WEBrick::Log.new(File::NULL), AccessLog: [],
      RequestCallback: proc { |_req, res| res['Cache-Control'] = 'no-cache'; res['X-Content-Type-Options'] = 'nosniff' }
    )
    port = p
    break
  rescue Errno::EADDRINUSE, Errno::EACCES
    next
  end
end
abort "no free port from #{start_port}" unless server

File.write("#{port_file}.tmp", "#{port}\n")
File.rename("#{port_file}.tmp", port_file)
%w[TERM HUP INT].each { |s| trap(s) { server.shutdown } }
server.start
