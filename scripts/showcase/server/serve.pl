#!/usr/bin/perl
# Offline showcase kit: a static file server written with core Perl modules only (macOS ships /usr/bin/perl).
# Usage: perl serve.pl ROOT START_PORT PORT_FILE
#   Binds 127.0.0.1 only, tries START_PORT and the next 49 ports, writes the port it got into PORT_FILE.
#   GET and HEAD; one forked child per connection (a browser's idle pre-connection cannot block the others);
#   path traversal refused; MIME types for everything the built app uses.
use strict;
use warnings;
use IO::Socket::INET;
use Cwd qw(abs_path);
use POSIX qw(WNOHANG);

my ($root_arg, $start_port, $port_file) = @ARGV;
die "usage: serve.pl ROOT START_PORT PORT_FILE\n" unless defined $port_file;
my $root = abs_path($root_arg) or die "no such folder: $root_arg\n";
die "not a folder: $root\n" unless -d $root;

my %MIME = (
  html => 'text/html; charset=utf-8', htm => 'text/html; charset=utf-8',
  js => 'text/javascript; charset=utf-8', mjs => 'text/javascript; charset=utf-8',
  css => 'text/css; charset=utf-8', json => 'application/json; charset=utf-8',
  map => 'application/json; charset=utf-8', wasm => 'application/wasm',
  svg => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg',
  gif => 'image/gif', ico => 'image/x-icon', webp => 'image/webp',
  woff2 => 'font/woff2', woff => 'font/woff', ttf => 'font/ttf',
  txt => 'text/plain; charset=utf-8', csv => 'text/csv; charset=utf-8',
  mp3 => 'audio/mpeg', wav => 'audio/wav', ogg => 'audio/ogg', mp4 => 'video/mp4', pdf => 'application/pdf',
);

my $server;
my $port;
for my $p ($start_port .. $start_port + 49) {
  $server = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $p, Proto => 'tcp', Listen => 64, ReuseAddr => 1);
  if ($server) { $port = $p; last; }
}
die "no free port from $start_port\n" unless $server;

# write the port atomically: the launcher reads the file as soon as it exists
open(my $pf, '>', "$port_file.tmp") or die "cannot write $port_file.tmp: $!\n";
print $pf "$port\n";
close $pf;
rename("$port_file.tmp", $port_file) or die "cannot rename port file: $!\n";

$SIG{CHLD} = 'IGNORE'; # children reap themselves
$SIG{PIPE} = 'IGNORE';
$SIG{TERM} = $SIG{HUP} = $SIG{INT} = sub { exit 0 };

while (1) {
  my $client = $server->accept;
  next unless $client; # EINTR
  my $pid = fork();
  if (!defined $pid) { close $client; next; }
  if ($pid == 0) {
    close $server;
    handle($client);
    exit 0;
  }
  close $client;
}

sub reply {
  my ($c, $code, $reason, $type, $body, $head) = @_;
  $body = '' unless defined $body;
  print $c "HTTP/1.1 $code $reason\r\nContent-Type: $type\r\nContent-Length: " . length($body)
    . "\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
  print $c $body unless $head;
}

sub handle {
  my ($c) = @_;
  binmode $c;
  local $SIG{ALRM} = sub { exit 0 }; # an idle or slow connection is dropped after 15 s
  alarm 15;
  my $line = <$c>;
  return unless defined $line;
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/; }
  alarm 0;
  my ($method, $target) = $line =~ m{^([A-Z]+)\s+(\S+)\s+HTTP/\d\.\d\s*$};
  return reply($c, 400, 'Bad Request', 'text/plain', "Bad request\n") unless $method;
  my $head = $method eq 'HEAD';
  return reply($c, 405, 'Method Not Allowed', 'text/plain', "Only GET and HEAD\n") unless $method eq 'GET' || $head;

  my $path = $target;
  $path =~ s/[?#].*//s;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  # refuse anything that could leave the root: '..' segments, backslashes, NUL
  if ($path !~ m{^/} || $path =~ m{(^|/)\.\.(/|$)} || $path =~ /[\\\0]/) {
    return reply($c, 403, 'Forbidden', 'text/plain', "Forbidden\n", $head);
  }
  my $file = $root . $path;
  $file .= 'index.html' if $file =~ m{/$};
  $file .= '/index.html' if -d $file;
  my $real = -e $file ? abs_path($file) : undef;
  if (!defined $real || index($real, "$root/") != 0 || !-f $real || !-r $real) {
    return reply($c, 404, 'Not Found', 'text/plain', "Not found\n", $head);
  }
  my ($ext) = $real =~ /\.([A-Za-z0-9]+)$/;
  my $type = $MIME{lc($ext // '')} // 'application/octet-stream';
  my $size = -s $real;
  open(my $fh, '<', $real) or return reply($c, 403, 'Forbidden', 'text/plain', "Forbidden\n", $head);
  binmode $fh;
  print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\nContent-Length: $size\r\nCache-Control: no-cache\r\n"
    . "X-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
  unless ($head) {
    my $buf;
    while (read($fh, $buf, 65536)) { print $c $buf or last; }
  }
  close $fh;
}
