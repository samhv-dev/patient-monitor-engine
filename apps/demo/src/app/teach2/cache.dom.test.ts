// @vitest-environment happy-dom
// The staged-delivery cache through the sheets slot on a real Link and ControllerSession over the in-process hub, a
// host that acks every command (plan IP7; design §4.2; answer 11): n items from two sheets (a drug and a fluid from the
// Drug sheet, an airway change from the Airway sheet's own Stage button) are delivered as ONE stageGroup with ONE batch
// id, and make ONE clinical-log line (and one controller log line, IP1); at n = 0 Deliver is grey and sends nothing;
// closing a sheet keeps the cache; a card step cannot be added.
import { ControllerSession, createInProcessHub, createStamper, type ScenarioDoc, type WireCommand, type WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { Link } from '../link.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { DEFAULT_SITE } from '../site.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mountKeys } from './keys.ts';
import { mount } from './sheets.ts';

const S = 'CCH234';
const settle = () => new Promise((r) => setTimeout(r, 0));
const until = async (ok: () => boolean) => {
  for (let i = 0; i < 50 && !ok(); i++) await settle();
};
const key = (k: string, target: EventTarget = document.body) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

let done: Array<() => void> = [];
afterEach(() => {
  for (const f of done) f();
  done = [];
  document.body.replaceChildren();
});

function rig() {
  const hub = createInProcessHub();
  const host = hub.connect();
  const t = hub.connect();
  const ctl = new ControllerSession({ session: S, transport: t, peerId: 'ctl-c' });
  const link = new Link(ctl, t, null);
  const got: WireCommand[] = [];
  const stamp = createStamper(S, 'host-1');
  host.onMessage((m: WireMessage) => {
    if (m.kind !== 'command') return;
    got.push(m.body);
    host.send(stamp({ kind: 'ack', commandId: m.body.id, accepted: true, tick: 9 }));
  });
  const root = document.createElement('div');
  const layer = document.createElement('div');
  const tools = document.createElement('div');
  const note = document.createElement('div');
  root.append(layer, tools, note);
  document.body.append(root);
  const keys = mountKeys(root, { link, togglePause: () => undefined });
  const ctx: Teach2Ctx = { link, site: DEFAULT_SITE, weightKg: () => 70, keys, dock: { tools, note }, openSheet: () => undefined, loadScenario: () => true };
  const slot = mount(layer, ctx);
  done.push(() => (slot.destroy(), keys.destroy(), link.close(), ctl.close()));
  const sheet = (id: string) => layer.querySelector<HTMLElement>(`.ip2-sheet[data-sheet="${id}"]`);
  const open = () => layer.querySelector<HTMLElement>('.ip2-sheet:not([hidden])');
  const deliver = () => layer.querySelector<HTMLButtonElement>('.ip2-deliver') as HTMLButtonElement;
  const staged = () => tools.querySelector('.ip2-staged')?.textContent;
  const stagedShown = () => { const b = tools.querySelector<HTMLElement>('.ip2-staged'); return !!b && !b.hidden; };
  const pick = (k: string) => (open()?.querySelector(`.ip2-pick[data-key="${k}"]`) as HTMLButtonElement).click();
  const group = (g: string) => (open()?.querySelector(`[data-group="${g}"]`) as HTMLButtonElement).click();
  const add = () => (open()?.querySelector('.ip2-add') as HTMLButtonElement).click();
  return { ctl, link, got, layer, tools, ctx, slot, sheet, open, deliver, staged, stagedShown, pick, group, add };
}

describe('the staged-delivery cache', () => {
  it('n items from two sheets: one stageGroup, one batch id, one clinical-log line', async () => {
    const r = rig();
    key('d');
    expect(r.open()?.dataset.sheet).toBe('drug');
    r.group('all');
    r.pick('drug:propofol');
    r.add();
    r.group('fluids');
    r.pick('fluid:crystalloid');
    r.add();
    key('a'); // the Airway sheet: today's tab body, its own Stage button stages into the same cache
    expect(r.open()?.dataset.sheet).toBe('airway');
    ([...(r.open()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'Stage') as HTMLButtonElement).click();
    expect(r.staged()).toBe('Staged · 3');
    expect([...(r.open()?.querySelectorAll('.ip2-chip') ?? [])]).toHaveLength(3);
    expect(r.deliver().textContent).toBe('Deliver the staged cache (3 items)');
    expect(r.deliver().disabled).toBe(false);

    const logBefore = r.link.log.length;
    const ctlBefore = r.ctl.log.filter((l) => l.kind === 'command').length;
    r.deliver().click();
    await until(() => r.got.length === 3 && r.link.log.length > logBefore);
    expect(r.got.map((c) => (c as { event?: { kind?: string } }).event?.kind)).toEqual(['drug', 'fluid', 'airway']);
    const groups = new Set(r.got.map((c) => c.stageGroup));
    const batches = new Set(r.got.map((c) => JSON.stringify(c.batch)));
    expect(groups.size).toBe(1);
    expect(batches.size).toBe(1);
    expect(r.got[0]?.batch).toEqual({ id: r.got[0]?.stageGroup, n: 3 });
    const lines = r.link.log.slice(logBefore);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.kind).toBe('instructor');
    expect(lines[0]?.text).toMatch(/^Staged delivery, 3 at one instant: .*propofol.* · .*crystalloid.* · .*airway/i);
    expect(r.ctl.log.filter((l) => l.kind === 'command').length).toBe(ctlBefore + 1); // IP1: one controller line too
    expect(r.staged()).toBe('Staged · 0');
    expect(r.stagedShown()).toBe(false);
    expect(r.deliver().disabled).toBe(true);
  });

  it('the dock\'s "Staged · n" shows only while something is staged (the owner, 1 November): hidden at 0, "Staged · 1" with one item, hidden again after Deliver', async () => {
    const r = rig();
    expect(r.stagedShown()).toBe(false);
    key('d');
    r.group('all');
    r.pick('drug:propofol');
    r.add();
    expect(r.stagedShown()).toBe(true);
    expect(r.staged()).toBe('Staged · 1');
    r.deliver().click();
    await until(() => r.got.length === 1 && !r.stagedShown());
    expect(r.got).toHaveLength(1);
    expect(r.stagedShown()).toBe(false);
  });

  it('n = 0: Deliver is grey, not clickable, and sends nothing', async () => {
    const r = rig();
    key('d');
    expect(r.deliver().textContent).toBe('Deliver the staged cache (0 items)');
    expect(r.deliver().disabled).toBe(true);
    expect(r.deliver().getAttribute('aria-disabled')).toBe('true');
    r.deliver().click();
    await settle();
    expect(r.got).toEqual([]);
  });

  it('closing a sheet keeps the cache; the dock shows Staged · n; a chip\'s ✕ takes one item out', async () => {
    const r = rig();
    key('d');
    r.group('all');
    r.pick('drug:propofol');
    r.add();
    r.pick('drug:fentanyl');
    r.add();
    key('Escape');
    expect(r.open()).toBeNull();
    expect(r.staged()).toBe('Staged · 2');
    expect(r.stagedShown()).toBe(true);
    key('v'); // another sheet shows the same cache
    expect(r.open()?.querySelector('.ip2-tray-count')?.textContent).toBe('Staged · 2');
    (r.open()?.querySelector('.ip2-chip-x') as HTMLButtonElement).click();
    expect(r.staged()).toBe('Staged · 1');
    expect(r.got).toEqual([]); // nothing delivered by itself
  });

  it('a card step cannot be added: the button is disabled, S adds nothing', async () => {
    const r = rig();
    const sv = r.ctl.scenario;
    sv.doc = showcaseDoc('showcase-mh') as ScenarioDoc;
    sv.docVersion = 1;
    sv.stateId = 'treating';
    key('d');
    r.pick('step:1:dantrolene');
    const add = r.open()?.querySelector('.ip2-add') as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(r.open()?.textContent).toContain('card steps are given from ACTION');
    key('s', r.open() as HTMLElement);
    expect(r.staged()).toBe('Staged · 0');
    expect(r.stagedShown()).toBe(false);
  });

  it('the onset of a staged delivery (retire-instructor-v1 G3): HR 140 and SpO₂ 88 "Over 2 min" ramp, the rhythm does not; "Now" sends no ramp; one choice for every sheet', async () => {
    const r = rig();
    r.ctl.state = { mode: 'manual', values: { hr: 80, spo2: 97 }, control: {} } as never; // MANUAL: Set stages a target
    key('v');
    const sheet = () => r.open() as HTMLElement;
    const stageVital = (v: string, value: number) => {
      const row = sheet().querySelector(`[data-var="${v}"]`) as HTMLElement;
      const inp = row.querySelector('input') as HTMLInputElement;
      inp.value = String(value);
      inp.dispatchEvent(new Event('change'));
      ([...row.querySelectorAll('button')].find((b) => b.textContent === 'Set') as HTMLButtonElement).click();
    };
    const onset = () => sheet().querySelector<HTMLSelectElement>('.ip2-onset select') as HTMLSelectElement;
    expect([...onset().options].map((o) => [o.value, o.textContent])).toEqual([['0', 'Now'], ['30', 'Over 30 s'], ['60', 'Over 1 min'], ['120', 'Over 2 min'], ['300', 'Over 5 min']]);
    expect(onset().value).toBe('0');
    stageVital('hr', 140);
    stageVital('spo2', 88);
    ([...sheet().querySelectorAll('button')].find((b) => b.textContent === 'Stage') as HTMLButtonElement).click(); // the rhythm
    expect(r.staged()).toBe('Staged · 3');
    onset().value = '120';
    onset().dispatchEvent(new Event('change'));
    key('d'); // the Drug sheet carries the same choice: one cache, one onset
    expect(onset().value).toBe('120');
    const logBefore = r.link.log.length;
    r.deliver().click();
    await until(() => r.got.length === 3 && r.link.log.length > logBefore);
    expect(new Set(r.got.map((c) => c.stageGroup)).size).toBe(1); // still one delivery at one instant
    const ramp = { durationS: 120, curve: 'linear' };
    expect(r.got.map((c) => [c.type, (c as { ramp?: unknown }).ramp])).toEqual([['setTarget', ramp], ['setTarget', ramp], ['setRhythm', undefined]]);
    expect(r.link.log.at(-1)?.text).toMatch(/over 2 min/);
    // "Now": no ramp (v2's behaviour before G3)
    key('v');
    onset().value = '0';
    onset().dispatchEvent(new Event('change'));
    stageVital('hr', 100);
    r.deliver().click();
    await until(() => r.got.length === 4);
    expect((r.got[3] as { type: string; ramp?: unknown }).type).toBe('setTarget');
    expect((r.got[3] as { ramp?: unknown }).ramp).toBeUndefined();
  });
});
