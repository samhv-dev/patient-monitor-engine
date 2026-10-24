// @vitest-environment happy-dom
// E121b: the Airway & ventilation tab's Oxygen control. Room air by default; choosing a device offers its flows and
// shows the FiO₂ they give; Stage stages ONE oxygen event under its own key (Stage / Apply / Commit like every panel
// action), with the clinical line the log and the Debrief print.
import { beforeEach, describe, expect, it } from 'vitest';
import type { PanelCtx } from './ctx.ts';
import { airwayTab } from './airway.ts';

function rig() {
  const staged: Array<{ c: unknown; key: string; text: string }> = [];
  const ctx = { link: {}, staging: { submit: (c: unknown, key: string, text: string) => staged.push({ c, key, text }) }, site: {}, weightKg: () => 70, onRefresh: () => undefined, goTab: () => undefined } as unknown as PanelCtx;
  const el = airwayTab(ctx);
  document.body.append(el);
  const o2 = el.querySelector<HTMLElement>('[role=group][aria-label=Oxygen]')!;
  const choose = (name: string) => [...o2.querySelectorAll('button')].find((b) => b.textContent === name)!.click();
  const flow = [...el.querySelectorAll<HTMLSelectElement>('select')].find((s) => s.labels?.[0]?.textContent === 'Flow')!;
  const hint = flow.closest('.field')!.nextElementSibling as HTMLElement;
  // the Stage button of the Oxygen section: the first row after its heading
  const stageOxygen = () => {
    let n: Element | null = [...el.querySelectorAll('h3')].find((x) => x.textContent === 'Oxygen')!;
    while (n && !(n.classList.contains('row') && n.querySelector('button')?.textContent === 'Stage')) n = n.nextElementSibling;
    (n!.querySelector('button') as HTMLButtonElement).click();
  };
  return { el, o2, choose, flow, hint, staged, stageOxygen };
}

describe('Airway & ventilation: oxygen for the spontaneously breathing patient (E121b)', () => {
  beforeEach(() => document.body.replaceChildren());

  it('starts at room air: Off pressed, no flow offered, FiO₂ 21 %', () => {
    const { o2, flow, hint } = rig();
    expect(o2.querySelector('[aria-pressed=true]')?.textContent).toBe('Off (room air)');
    expect(flow.closest<HTMLElement>('.field')!.hidden).toBe(true);
    expect(hint.textContent).toMatch(/^Room air: FiO₂ 21 %/);
  });

  it('a face mask offers 5–10 L/min from 10, shows the FiO₂, and stages "Oxygen by face mask 10 L/min (FiO₂ 60 %)"', () => {
    const { choose, flow, hint, staged, stageOxygen } = rig();
    choose('Face mask');
    expect([...flow.options].map((o) => o.textContent)).toEqual(['5 L/min', '6 L/min', '8 L/min', '10 L/min']);
    expect(flow.value).toBe('10');
    expect(flow.closest<HTMLElement>('.field')!.hidden).toBe(false);
    expect(hint.textContent).toMatch(/^FiO₂ about 60 %/);
    stageOxygen();
    expect(staged).toEqual([{
      c: { type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.6, o2Device: 'mask', o2FlowLpm: 10 } },
      key: 'oxygen', text: 'Oxygen by face mask 10 L/min (FiO₂ 60 %)',
    }]);
  });

  it('a nasal cannula at 4 L/min stages FiO₂ 36 %; Off stages room air under the same key', () => {
    const { choose, flow, hint, staged, stageOxygen } = rig();
    choose('Nasal cannula');
    expect(flow.value).toBe('2');
    flow.value = '4';
    flow.dispatchEvent(new Event('change'));
    expect(hint.textContent).toMatch(/^FiO₂ about 36 %/);
    stageOxygen();
    choose('Off (room air)');
    stageOxygen();
    expect(staged.map((s) => [s.key, s.text])).toEqual([['oxygen', 'Oxygen by nasal cannula 4 L/min (FiO₂ 36 %)'], ['oxygen', 'Oxygen off: room air (FiO₂ 21 %)']]);
  });
});
