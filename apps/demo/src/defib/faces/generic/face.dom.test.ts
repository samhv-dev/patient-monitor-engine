// @vitest-environment happy-dom
// The generic face (plan defibrillator-zoll-m2.md §4.2, piece F0): today's window — the energy readout, Charge and
// Shock — drawn from the core with a fake driver. Its whole behaviour on the wire is defib-window*.dom.test.ts's and
// learner-defib.e2e.ts's, unchanged; here: the Shock key's pointer phases reach the core apart from its click, and an
// M2 room (until F1 registers its face) shows this face with the M2's energy list and a plain line.
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
const status = (o: Partial<DefibStatusIn> = {}): DefibStatusIn => ({ defib: { energyJ: 120, state: 'idle', sync: false, readyAt: null, shocks: 0, lastShock: null }, pacer: null, ...o });

function mount() {
  const sent: DefibCommand[] = [];
  let feed = (_s: DefibStatusIn) => {};
  const core = createDefibCore({ newId: () => `c${sent.length + 1}`, send: (c) => void sent.push(c), onStatus: (fn) => ((feed = fn), () => {}), onAck: () => () => {} }, genericFace.spec);
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
  it("is today's window: the readout on the stage, Charge and Shock with the said line in the bar", () => {
    const m = mount();
    expect(m.stage.querySelector('.defib-readout')?.getAttribute('aria-label')).toBe('Defibrillator');
    expect([...m.bar.children].map((e) => e.className)).toEqual(['defib-keys', 'defib-said']);
    m.feed(status());
    expect(m.stage.querySelector('.defib-readout')?.textContent).toBe('120 J');
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
