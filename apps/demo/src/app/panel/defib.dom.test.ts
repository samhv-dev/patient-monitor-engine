// @vitest-environment happy-dom
// Room plan R5b: the Defib tab's energy starts at the room's defibrillator model's adult energy (it was a fixed 200 J,
// panel/defib.ts), follows a change of the model, and offers the model's AED ladder as presets when it has one. With no
// model chosen nothing a press sends changes.
import { describe, expect, it } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import type { Link } from '../link.ts';
import { DEFAULT_SITE, type SiteProfile } from '../site.ts';
import type { PanelCtx } from './ctx.ts';
import { defibTab, presetsOf } from './defib.ts';

const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
function rig(defibModel: string | null) {
  const sent: CommandInput[] = [];
  const link = { device: null, send: async (c: CommandInput) => (sent.push(c), OK), onChange: () => () => undefined } as unknown as Link;
  let refresh = () => undefined as void;
  const site: SiteProfile = { ...DEFAULT_SITE, defibModel };
  const ctx = { link, staging: { submit: () => undefined }, site, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
  const el = defibTab(ctx);
  document.body.replaceChildren(el);
  refresh();
  const energy = () => Number((el.querySelector('input[aria-label="Energy (J)"]') as HTMLInputElement).value);
  const press = async (name: string) => {
    ([...el.querySelectorAll('button')].find((b) => b.textContent === name) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
  };
  return { el, sent, site, energy, press, refresh: () => refresh() };
}

describe("R5b: the Defib tab's energies from the room's defibrillator model", () => {
  it('no model chosen: 200 J as before, and Charge and Shock send exactly what they sent', async () => {
    const r = rig(null);
    expect(r.energy()).toBe(200);
    await r.press('Charge');
    await r.press('Shock');
    expect(r.sent).toEqual([
      { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
      { type: 'applyEvent', event: { kind: 'defib', action: 'shock', energyJ: 200 } },
    ]);
    expect(r.el.querySelector('.defib-presets')).toBeNull();
  });
  it('the generic model: 120 J, and the charge carries it; no ladder, so no presets', async () => {
    const r = rig('generic');
    expect(r.energy()).toBe(120);
    await r.press('Charge');
    expect(r.sent).toEqual([{ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 120 } }]);
    expect(r.el.querySelector('.defib-presets')).toBeNull();
  });
  it('a change of the model in Room setup moves the energy to the new default at the next repaint (an instructor\'s own value stays otherwise)', () => {
    const r = rig(null);
    r.refresh();
    expect(r.energy()).toBe(200);
    r.site.defibModel = 'generic';
    r.refresh();
    expect(r.energy()).toBe(120);
    const input = r.el.querySelector('input[aria-label="Energy (J)"]') as HTMLInputElement;
    input.value = '150';
    r.refresh();
    expect(r.energy()).toBe(150);
  });
  it("a model with an AED ladder offers it as presets (the department's model, when it comes, as a skin: lifepak-like's block here)", () => {
    expect(presetsOf({ energyAdultJ: 200, energyPaedJ: 50, aedSequenceJ: [200, 300, 360] })).toEqual([200, 300, 360]);
    expect(presetsOf({ energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: null })).toEqual([]);
  });
});
