// @vitest-environment happy-dom
// The Debrief view and the archive "Finish the case" writes (the owner's board "Finish 2", approved 30 October): the
// resident typed in the Finish pane is in the report's header band (on screen, in the PDF) and in the learner
// handout's, so a printed debrief is identifiable; a saved debrief opens from the archive (#/debrief/archive/<id>) and
// prints (…/print); the view lists the archive in its own section (number, resident and card, save time, met,
// duration; open · PDF · JSON), exports it all as one JSON file and clears it behind a confirm.
import type { WireEvent } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archive } from '../archive.ts';
import type { Link } from '../link.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { RunRecord } from '../record.ts';
import type { AppSession } from '../session.ts';
import induction from '../showcase/showcase-induction.json';
import mh from '../showcase/showcase-mh.json';
import { debriefView } from './debrief.ts';

const settle = () => new Promise((r) => setTimeout(r, 0));
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const scen = (t: number, stateId: string): WireEvent => ({ type: 'scenario', t, stateId }) as WireEvent;

function record(doc: { initialState: string }, startedAt: number): RunRecord {
  const r = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => startedAt);
  r.wire(applied(0, { type: 'scenario', action: 'load', doc }));
  r.wire(scen(0, doc.initialState));
  r.note(90, 'Handed over');
  return r;
}

/** The anchors the app's download clicks: their file names and texts. */
function downloads() {
  const got: Array<{ name: string; blob: Blob }> = [];
  const blobs = new Map<string, Blob>();
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    const u = `blob:test/${blobs.size}`;
    blobs.set(u, b as Blob);
    return u;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    got.push({ name: this.download, blob: blobs.get(this.getAttribute('href') ?? '') as Blob });
  });
  return got;
}

describe('the Debrief view and the archive (board "Finish 2")', () => {
  let leave: (() => void) | undefined;
  beforeEach(() => void vi.stubGlobal('localStorage', new MemoryStorage()));
  afterEach(() => {
    leave?.();
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const show = (live: RunRecord, sub = '') => {
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record: live } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.(sub);
    leave = view.leave;
    const text = (s: string) => view.el.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
    return { view, el: view.el, text, enter: (s: string) => view.enter?.(s) };
  };

  it('the resident saved for the live run is in the header band and in the learner handout\'s', () => {
    const live = record(induction, Date.UTC(2026, 9, 30, 9, 0));
    const before = show(live);
    expect(before.el.querySelector('.db-resident')).toBeNull(); // not saved yet: the header as before
    leave?.();
    document.body.replaceChildren();
    archive.save(live.data, 'Dr Rahimi', 'b');
    const r = show(live);
    expect(r.text('#db-live-1 .db-band .db-resident')).toBe('Resident: Dr Rahimi');
    expect(r.text('.db-handout-live .db-band .db-resident')).toBe('Resident: Dr Rahimi');
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Healthy induction');
  });

  it('#/debrief/archive/<id> opens a saved debrief, not the live run; …/print prints it', async () => {
    const saved = record(mh, Date.UTC(2026, 9, 30, 8, 0));
    const e = archive.save(saved.data, 'Dr Karimi', 'b');
    const live = record(induction, Date.UTC(2026, 9, 30, 9, 0));
    const r = show(live, `archive/${e?.id}`);
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Malignant hyperthermia');
    expect(r.text('#db-live-1 .db-band .db-resident')).toBe('Resident: Dr Karimi');
    expect(r.text('.db-viewing')).toMatch(/^Saved debrief 1: Dr Karimi · Malignant hyperthermia, saved at \d\d:\d\d\. Back to the current run$/);
    expect(r.el.querySelector('.db-viewing a')?.getAttribute('href')).toBe('#/debrief');
    // the JSON button downloads the saved debrief, with its resident
    const got = downloads();
    ([...r.el.querySelectorAll('.db-tools button')].find((b) => b.textContent === 'Download the record (JSON)') as HTMLElement).click();
    expect(got.map((x) => x.name)).toEqual(['debrief-showcase-mh-2026-10-30-Dr-Karimi.json']);
    expect(JSON.parse(await (got[0]?.blob as Blob).text())).toMatchObject({ schema: 'pme-archive-entry/1', resident: 'Dr Karimi', debrief: { record: { startedAt: saved.data.startedAt } } });
    // the live run again
    r.enter('');
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Healthy induction');
    expect(r.el.querySelector('.db-viewing')?.closest('[hidden]') ?? r.el.querySelector('.db-viewing[hidden]')).not.toBeNull();
    // print: the saved debrief, then the address without /print
    const print = vi.fn();
    Object.assign(window, { print });
    r.enter(`archive/${e?.id}/print`);
    await settle();
    await settle();
    expect(print).toHaveBeenCalledTimes(1);
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Malignant hyperthermia');
    expect(location.hash).toBe(`#/debrief/archive/${e?.id}`);
  });

  it('an unknown archive id says so and shows the live run', () => {
    const r = show(record(induction, 1), 'archive/nope');
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Healthy induction');
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent)).toContain('That saved debrief is not in this browser’s archive');
  });

  it('the Archive section: the rows, open · PDF · JSON, export all as one JSON file, clear behind a confirm', async () => {
    const got = downloads();
    const a = archive.save(record(mh, Date.UTC(2026, 9, 30, 8, 0)).data, 'Dr Karimi', 'b');
    const b = archive.save(record(induction, Date.UTC(2026, 9, 30, 9, 0)).data, '', 'b');
    const r = show(record(induction, 3));
    expect(r.text('#db-archive h2')).toBe('Archive');
    expect(r.text('#db-archive .db-arc-count')).toBe('2 saved today · kept in this browser until you clear it');
    const rows = [...r.el.querySelectorAll<HTMLElement>('#db-archive .db-arc-row')];
    expect(rows.map((x) => [x.querySelector('.db-arc-n')?.textContent, x.querySelector('.db-arc-title')?.textContent])).toEqual([
      ['1', 'Dr Karimi · Malignant hyperthermia'],
      ['2', 'Resident not named · Healthy induction'],
    ]);
    expect(rows[0]?.querySelector('.db-arc-sub')?.textContent).toMatch(/^\d\d:\d\d · \d+ of \d+ met · 01:30$/);
    (rows[1]?.querySelector('.db-arc-open') as HTMLElement).click();
    expect(location.hash).toBe(`#/debrief/archive/${b?.id}`);
    (rows[0]?.querySelector('.db-arc-pdf') as HTMLElement).click();
    expect(location.hash).toBe(`#/debrief/archive/${a?.id}/print`);
    (rows[0]?.querySelector('.db-arc-json') as HTMLElement).click();
    expect(got[0]?.name).toBe('debrief-showcase-mh-2026-10-30-Dr-Karimi.json');
    ([...r.el.querySelectorAll<HTMLElement>('#db-archive button')].find((x) => x.textContent === 'Export all (one JSON file)') as HTMLElement).click();
    const all = JSON.parse(await (got[1]?.blob as Blob).text());
    expect(all.schema).toBe('pme-archive/1');
    expect(all.entries).toHaveLength(2);
    // clear: a confirm first; Keep them keeps them
    const clear = [...r.el.querySelectorAll<HTMLElement>('#db-archive button')].find((x) => x.textContent === 'Clear the archive') as HTMLElement;
    expect(clear.classList.contains('db-arc-clear')).toBe(true);
    const answer = async (word: string) => {
      await settle();
      const d = document.querySelector('dialog[open]') as HTMLDialogElement;
      expect(d.querySelector('h2')?.textContent).toBe('Clear the archive?');
      ([...d.querySelectorAll('button')].find((x) => x.textContent === word) as HTMLElement).click();
      await settle();
      await settle();
    };
    clear.click();
    await answer('Keep them');
    expect(archive.list()).toHaveLength(2);
    clear.click();
    await answer('Clear');
    expect(archive.list()).toEqual([]);
    expect(r.text('#db-archive .db-arc-count')).toBe('Nothing saved in this browser. “Finish the case” in Instructor v2 saves each run here.');
    expect(r.el.querySelectorAll('#db-archive .db-arc-row')).toHaveLength(0);
  });

  it('#/debrief/archive opens the view on its Archive section', () => {
    const scrolled: Element[] = [];
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
      scrolled.push(this);
    });
    const r = show(record(induction, 1), 'archive');
    expect(scrolled.map((x) => x.id)).toEqual(['db-archive']);
    expect(r.text('#db-live-1 .db-band .db-title')).toBe('Healthy induction');
  });
});
