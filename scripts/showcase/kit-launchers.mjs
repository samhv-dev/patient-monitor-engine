// The showcase kit's Windows launchers (make-bundle.mjs writes them; kit-windows.test.ts checks what it writes).
// Written with CRLF line endings whatever the checkout has (cmd.exe misreads `goto` labels in an LF-only batch file),
// and refused if they hold anything but printable ASCII (cmd.exe reads a .cmd in the console's OEM code page).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** [source in scripts/showcase/kit/, name in the kit] */
export const WINDOWS_LAUNCHERS = [
  ['start-classroom.cmd', 'Start Classroom.cmd'],
  ['start-simulator.cmd', 'Start Simulator.cmd'],
];

export function writeWindowsLaunchers(kitSrc, out) {
  for (const [src, name] of WINDOWS_LAUNCHERS) {
    const text = readFileSync(join(kitSrc, src), 'utf8');
    const bad = /[^\t\n\r\x20-\x7e]/.exec(text);
    if (bad) throw new Error(`${src}: a .cmd must be printable ASCII; found U+${bad[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
    writeFileSync(join(out, name), text.replace(/\r?\n/g, '\r\n'));
  }
}
