// Two actions reachable from several places (session bar, Scenario and Log tabs, keyboard, Settings): a bookmark that
// the 6b driver can restore (CAE Maestro's marker-revert), and the keyboard shortcut sheet (brief §9).
import type { Link } from './link.ts';
import { infoDialog, toast } from './ui.ts';

let nBookmark = 0;
export async function bookmark(link: Link): Promise<void> {
  const label = `Bookmark ${++nBookmark} at ${clockOf(link.simT)}`;
  const r = await link.send({ type: 'scenario', action: 'bookmark', target: label });
  toast(r.accepted ? `${label} saved` : 'Bookmark not saved');
}

const clockOf = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function shortcutsDialog(): Promise<void> {
  return infoDialog('Keyboard shortcuts', [
    'i  show or hide the instructor view', 'Shift+S  silence the alarm sound', 'Shift+P  pause alarms', 'Shift+N  start an NIBP measurement',
    'Shift+B  bookmark this moment', '⌘/Ctrl+Enter  commit the staged changes', 'Esc  close a dialog',
    'Shortcuts are ignored while you type in a field.',
  ].join('\n'));
}
