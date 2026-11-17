// @vitest-environment happy-dom
// The generic face (plan defibrillator-zoll-m2.md §4.2, piece F0): the energy readout, energy select along the room
// model's list, Charge and Shock, drawn from the core with a fake driver. Its behaviour on the wire is
// defib-window*.dom.test.ts's and learner-defib.e2e.ts's; here: energy select's steps, ends and spoken labels, the Shock
// key's pointer phases apart from its click, and an M2 room (until F1 registers its face) with the M2's list and a line.
import { createEngine, type Command, type M2Status } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { createDefibCore } from '../../core/core.ts';
import type { DefibCommand, DefibStatusIn, Phase } from '../../core/types.ts';
import { genericFace } from './face.ts';

const M2: M2Status = (() => {
  const e = createEngine({ seed: 1, device: { skin: 'saadat-like' } });
  let got: M2Status | undefined;
  e.on((x) => void (x.type === 'deviceStatus' && x.m2 && (got = x.m2)), ['deviceStatus']);
  e.dispatch({ id: 'm', issuedBy: 'instructor', type: 'device', action: { device: 'defib', action: 'model', value: 'zoll-m2' } } as Command);
  e.advanceTo(1.1);
  if (!got) throw new Error('no M2 status');
  return got;
})();
const status = (o: Partial<DefibStatusIn> = {}, energyJ = 120): DefibStatusIn => ({ defib: { energyJ, state: 'idle', sync: false, readyAt: null, shocks: 0, lastShock: null }, pacer: null, ...o });
const energyKey = (name: string) => document.querySelector<HTMLButtonElement>(`.defib-energy button[aria-label="${name}"]`) as HTMLButtonElement;
const energyTo = (energyJ: number) => ({ type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ } });

function mount(model: string | null = null) {
  const sent: DefibCommand[] = [];
  let feed = (_s: DefibStatusIn) => {};
  const core = createDefibCore({ newId: () => `c${sent.length + 1}`, send: (c) => void sent.push(c), onStatus: (fn) => ((feed = fn), () => {}), onAck: () => () => {} }, genericFace.spec, { model: () => model });
  const presses: Array<[string, Phase]> = [];
  const press = core.press;
  core.press = (k, p) => (presses.push([k, p]), press(k, p));
  document.body.replaceChildren();
  const stage = document.createElement('div');
  const bar = document.createElement('div');
  document.body.append(stage, bar);
  const ui = genericFace.mount(core, { stage, bar });
  return { sent, presses, feed: (s: DefibStatusIn) => feed(s), stage, bar, ui };
}
const shock = () => [...document.querySelectorAll<HTMLButtonElement>('.defib-keys button')].find((b) => b.textContent === 'Shock') as HTMLButtonElement;

describe('the generic face', () => {
  it('the readout on the stage; energy select, Charge and Shock with the said line in the bar', () => {
    const m = mount('generic');
    expect(m.stage.querySelector('.defib-readout')?.getAttribute('aria-label')).toBe('Defibrillator');
    expect([...m.bar.children].map((e) => e.className)).toEqual(['defib-energy', 'defib-keys', 'defib-said']);
    m.feed(status());
    expect(m.stage.querySelector('.defib-readout')?.textContent).toBe('120 J');
  });

  it('energy select has a spoken label for each key and for the selected energy, and shows the energy the device holds', () => {
    const m = mount('generic');
    m.feed(status());
    const group = m.bar.querySelector('.defib-energy') as HTMLElement;
    expect([group.getAttribute('role'), group.getAttribute('aria-label'), group.hidden]).toEqual(['group', 'Energy select', false]);
    expect([...group.querySelectorAll('button')].map((b) => [b.getAttribute('aria-label'), b.type])).toEqual([['Energy down', 'button'], ['Energy up', 'button']]);
    const out = group.querySelector('output') as HTMLOutputElement;
    expect([out.getAttribute('aria-label'), out.textContent]).toEqual(['Selected energy', '120 J']);
    m.feed(status({}, 150));
    expect(out.textContent).toBe('150 J');
  });

  it("steps one place along the generic model's list each way, from the device's energy", () => {
    const m = mount('generic');
    m.feed(status());
    energyKey('Energy up').click();
    energyKey('Energy down').click();
    expect(m.sent).toEqual([energyTo(150), energyTo(100)]);
  });

  it("stops at the list's ends: the key at an end says so and sends nothing", () => {
    const m = mount('generic');
    m.feed(status({}, 200));
    expect([energyKey('Energy up').getAttribute('aria-disabled'), energyKey('Energy down').getAttribute('aria-disabled')]).toEqual(['true', 'false']);
    energyKey('Energy up').click();
    m.feed(status({}, 1));
    expect([energyKey('Energy up').getAttribute('aria-disabled'), energyKey('Energy down').getAttribute('aria-disabled')]).toEqual(['false', 'true']);
    energyKey('Energy down').click();
    expect(m.sent).toEqual([]);
  });

  it('with no model chosen there is no list, and energy select is not shown', () => {
    const m = mount(null);
    m.feed(status());
    expect((m.bar.querySelector('.defib-energy') as HTMLElement).hidden).toBe(true);
    energyKey('Energy up').click();
    expect(m.sent).toEqual([]);
  });

  it("the Shock key's pointer-down and pointer-up reach the core apart from its click; only the click sends", () => {
    const m = mount();
    shock().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    shock().dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    shock().click();
    expect(m.presses).toEqual([['shock', 'down'], ['shock', 'up'], ['shock', 'click']]);
    expect(m.sent).toEqual([{ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }]);
  });

  it('an M2 room shows this face with the M2\'s energy list and a plain line that its own face is not built yet', () => {
    const m = mount();
    m.feed(status());
    expect(m.bar.querySelector('.defib-note')).toBeNull();
    m.feed(status({ m2: M2 }));
    expect(m.bar.querySelector('.defib-note')?.textContent).toBe('ZOLL M2: its own face is not built yet; this is the generic window. Energies 1–10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200 J.');
    m.feed(status());
    expect((m.bar.querySelector('.defib-note') as HTMLElement).hidden).toBe(true);
  });

  it('stop() takes the readout off the stage', () => {
    const m = mount();
    m.ui.stop();
    expect(m.stage.querySelector('.defib-readout')).toBeNull();
  });
});
