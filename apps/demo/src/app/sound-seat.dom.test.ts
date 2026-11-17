// @vitest-environment happy-dom
// Of the pages of one browser that follow one session, at most one sounds (sound-seat.ts): two and three pages, a
// take-over, a page that closes or reloads, two presses at once, and another session's page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { soundSeat, soundWords, type SoundSeat } from './sound-seat.ts';

/** One browser's BroadcastChannel: a message reaches every other open channel of that name, later (as the browser's). */
class Bus {
  static open = new Set<Bus>();
  onmessage: ((e: MessageEvent) => void) | null = null;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
    Bus.open.add(this);
  }
  postMessage(m: unknown) {
    for (const b of Bus.open) if (b !== this && b.name === this.name) queueMicrotask(() => Bus.open.has(b) && b.onmessage?.({ data: structuredClone(m) } as MessageEvent));
  }
  close() {
    Bus.open.delete(this);
  }
}

const delivered = () => new Promise((r) => setTimeout(r, 0)); // every queued message has arrived
type Page = { where: string; win: EventTarget; sounding: boolean; stops: number; seat: SoundSeat; press(): void; words(): string };
const pages: Page[] = [];

/** A page of session `code` called `where`, with its Sound switch: on and off by a press, off when told to stop. */
function page(where: string, code = 'QFBAWA'): Page {
  const win = new EventTarget();
  const p: Page = {
    where, win, sounding: false, stops: 0,
    seat: soundSeat(code, where, () => ((p.sounding = false), p.stops++), win),
    press() {
      if (p.sounding) (p.sounding = false), p.seat.off();
      else (p.sounding = true), p.seat.on();
    },
    words: () => soundWords(p.sounding, p.seat.elsewhere),
  };
  pages.push(p);
  return p;
}
const sounding = () => pages.filter((p) => p.sounding).map((p) => p.where);

beforeEach(() => vi.stubGlobal('BroadcastChannel', Bus));
afterEach(() => {
  for (const p of pages.splice(0)) p.seat.close();
  Bus.open.clear();
  vi.unstubAllGlobals();
});

describe('one sounding page of a session per browser', () => {
  it('two pages: the second switched on takes the sound, and the first says where it went', async () => {
    const host = page("the instructor's page");
    const learner = page('the learner monitor');
    host.press();
    await delivered();
    expect([sounding(), host.words(), learner.words()]).toEqual([["the instructor's page"], 'Sound on', "Sound off: playing in the instructor's page"]);
    learner.press();
    await delivered();
    expect([sounding(), host.stops, host.words(), learner.words()]).toEqual([['the learner monitor'], 1, 'Sound off: playing in the learner monitor', 'Sound on']);
    host.press(); // taken back by a press
    await delivered();
    expect([sounding(), learner.words()]).toEqual([["the instructor's page"], "Sound off: playing in the instructor's page"]);
  });

  it('three pages: only the last switched on sounds, and both others name it', async () => {
    const [host, learner, defib] = [page("the instructor's page"), page('the learner monitor'), page('the defibrillator window')];
    host.press();
    await delivered();
    learner.press();
    await delivered();
    defib.press();
    await delivered();
    expect(sounding()).toEqual(['the defibrillator window']);
    expect([host.words(), learner.words()]).toEqual(['Sound off: playing in the defibrillator window', 'Sound off: playing in the defibrillator window']);
    expect([host.stops, learner.stops]).toEqual([1, 1]);
  });

  it('switched off by its own press: the sound is nowhere, and the others say plain "Sound off"', async () => {
    const host = page("the instructor's page");
    const learner = page('the learner monitor');
    host.press();
    learner.press();
    await delivered();
    learner.press();
    await delivered();
    expect([sounding(), host.words(), learner.words()]).toEqual([[], 'Sound off', 'Sound off']);
  });

  it('a sounding page that closes gives the sound up, and no other page takes it over', async () => {
    const host = page("the instructor's page");
    const learner = page('the learner monitor');
    host.press();
    await delivered();
    learner.press();
    await delivered();
    learner.seat.close();
    learner.sounding = false; // the page is gone, and its sound with it
    await delivered();
    expect([sounding(), host.words(), host.stops]).toEqual([[], 'Sound off', 1]);
  });

  it('a sounding page that reloads gives the sound up; the reloaded page starts off, and so do the others', async () => {
    const host = page("the instructor's page");
    const learner = page('the learner monitor');
    const defib = page('the defibrillator window');
    host.press();
    await delivered();
    learner.press();
    await delivered();
    learner.win.dispatchEvent(new Event('pagehide'));
    learner.seat.close();
    await delivered();
    expect([learner.stops, sounding(), host.words(), defib.words()]).toEqual([1, [], 'Sound off', 'Sound off']);
    const again = page('the learner monitor');
    await delivered();
    expect([sounding(), again.words()]).toEqual([[], 'Sound off']);
  });

  it('two presses before either page hears the other: exactly one sounds, and the other names it', async () => {
    const host = page("the instructor's page");
    const learner = page('the learner monitor');
    host.press();
    learner.press();
    await delivered();
    expect(sounding()).toHaveLength(1);
    const quiet = host.sounding ? learner : host;
    expect(quiet.words()).toBe(`Sound off: playing in ${sounding()[0]}`);
  });

  it("another session's page keeps its own sound", async () => {
    const host = page("the instructor's page", 'QFBAWA');
    const other = page('the learner monitor', 'ZXCVBN');
    host.press();
    other.press();
    await delivered();
    expect([sounding(), host.words(), other.words()]).toEqual([["the instructor's page", 'the learner monitor'], 'Sound on', 'Sound on']);
  });
});
