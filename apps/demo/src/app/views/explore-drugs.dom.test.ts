// @vitest-environment happy-dom
// The Explore Drugs page with more drugs given than the console's event-array limit (physiology-console/flatten.ts
// MAX_EVENT_ARRAY, 16): the engine's `drugs` event carries one row per drug given, and an array that long used to be
// dropped whole, so every per-drug row left the page at the 17th drug. The setup is views/explore.dom.test.ts's
// real-engine case (#184): every drug at the dose picker's first preset, then the rendered page.
import { createEngine, type Command, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it, vi } from 'vitest';
import { DRUG_LIST } from '../drugs.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { exploreView } from './explore.ts';

describe('the Explore Drugs page past 16 drugs', () => {
  it('keeps a row for each drug when 20 distinct drugs have been given', { timeout: 60_000 }, async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { spo2: 'on', co2: 'on' } } });
    let feed: (x: EngineEvent) => void = () => {};
    const view = exploreView({ onEvent: (f: typeof feed) => (feed = f), onMount: () => {} } as unknown as AppSession, { gasUnit: 'mmHg' } as SiteProfile);
    e.on((x: EngineEvent) => feed(x));
    e.advanceTo(60);
    const send = (event: Record<string, unknown>) => e.dispatch({ id: `c${event.drugId as string}`, issuedBy: 'test', type: 'applyEvent', event } as unknown as Command).accepted;
    const given: string[] = [];
    for (const d of DRUG_LIST.filter((x) => x.cls !== 'volatile')) {
      if (given.length === 20) break;
      const [dose, unit] = d.preset.bolus?.[0] ?? d.preset.infusion?.[0] ?? [1, d.amountUnit];
      if (send({ kind: 'drug', drugId: d.id, dose, unit, route: 'iv', ...(!d.preset.bolus && d.preset.infusion ? { infusion: true } : {}) })) given.push(d.id);
    }
    expect(given).toHaveLength(20);
    let drugsEvent: EngineEvent | undefined;
    e.on((x: EngineEvent) => { if (x.type === 'drugs') drugsEvent = x; });
    e.advanceTo(90);
    expect(drugsEvent?.type === 'drugs' && drugsEvent.drugs.length).toBe(20); // the engine sends all twenty
    view.enter?.('drugs');
    const table = view.el.querySelector('table.values') as HTMLTableElement;
    await vi.waitFor(() => expect(table.textContent).toContain('Total ('), { timeout: 5_000 });
    const text = table.textContent ?? '';
    view.leave?.();
    for (const id of given) expect(text, id).toContain(`Total (${DRUG_LIST.find((d) => d.id === id)!.name})`);
  });
});
