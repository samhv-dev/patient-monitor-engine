// The archive's list (the owner's board "Finish 2"), the one builder the Instructor v2 Finish pane and the Debrief view's
// Archive section share: one row per saved debrief, oldest first: its number, "<Resident> · <card>", the save time,
// "n of m met" and the run's duration, and three actions: open (the Debrief view on it), PDF (the same, printed) and
// JSON (the entry as a file). The run on screen, once saved, is marked "saved". Each place styles the `arc-*` classes.
import { archive, entryFileName, hhmm, type ArchiveMeta } from '../archive.ts';
import { mmss } from '../debrief.ts';
import { hrefOf } from '../router.ts';
import { download, h, toast } from '../ui.ts';

/** The address of a saved debrief in the Debrief view (`print`: printed on arrival). */
export const archiveHref = (id: string, print = false): string => hrefOf('debrief', `archive/${id}${print ? '/print' : ''}`);

/** "Dr Rahimi · Malignant hyperthermia". */
export const entryTitle = (e: ArchiveMeta): string => `${e.resident || 'Resident not named'} · ${e.title}`;

/** "12:31 · 4 of 6 met · 23:50". */
export const entrySub = (e: ArchiveMeta): string =>
  `${hhmm(e.savedAt)} · ${e.objectives.total ? `${e.objectives.met} of ${e.objectives.total} met` : 'no objectives'} · ${mmss(e.durationS)}`;

/** Download one entry (`pme-archive-entry/1`), once its body is read (IndexedDB answers asynchronously). */
export async function downloadEntry(e: ArchiveMeta): Promise<void> {
  const json = await archive.entryJson(e.id);
  if (json) download(entryFileName(e), json, 'application/json');
  else toast('That saved debrief could not be read from this browser’s archive', 'alert');
}

/** "Export all": every saved debrief in one JSON file (`pme-archive/1`; no zip library is in the dependency tree). */
export async function exportAll(): Promise<void> {
  download(`debrief-archive-${new Date().toISOString().slice(0, 10)}.json`, await archive.bundleJson(), 'application/json');
}

/** The list, its classes `<p>-list`, `<p>-row`, …; `draw()` rebuilds it when the archive or the marked run changed.
 *  `empty`: the line with nothing saved. */
export function archiveList(o: { p: string; empty?: string; current?: () => string | null }): { el: HTMLElement; draw(): void } {
  const { p } = o;
  const el = h('ol', { class: `${p}-list`, 'aria-label': 'Saved debriefs' });
  let drawn = '';
  const row = (e: ArchiveMeta, n: number, current: boolean): HTMLElement =>
    h('li', { class: `${p}-row`, 'data-id': e.id, ...(current ? { 'data-current': '' } : {}) },
      h('span', { class: `${p}-n`, 'aria-hidden': 'true' }, String(n)),
      h('span', { class: `${p}-text` }, h('b', { class: `${p}-title` }, entryTitle(e)), h('span', { class: `${p}-sub` }, entrySub(e))),
      current ? h('span', { class: `${p}-saved` }, 'saved') : null,
      h('span', { class: `${p}-acts`, role: 'group', 'aria-label': `Debrief ${n}` },
        h('button', { type: 'button', class: `${p}-open`, 'aria-label': `Open debrief ${n}`, onclick: () => void (location.hash = archiveHref(e.id)) }, 'open'),
        h('button', { type: 'button', class: `${p}-pdf`, 'aria-label': `Print debrief ${n} or save it as PDF`, onclick: () => void (location.hash = archiveHref(e.id, true)) }, 'PDF'),
        h('button', { type: 'button', class: `${p}-json`, 'aria-label': `Download debrief ${n} (JSON)`, onclick: () => void downloadEntry(e) }, 'JSON')));
  const draw = () => {
    const cur = o.current?.() ?? null;
    const key = `${archive.version}|${cur}|${archive.list().length}`;
    if (key === drawn) return;
    drawn = key;
    const list = archive.list();
    el.replaceChildren(...(list.length ? list.map((e, i) => row(e, i + 1, e.id === cur)) : o.empty ? [h('li', { class: `${p}-empty` }, o.empty)] : []));
  };
  draw();
  return { el, draw };
}
