// @vitest-environment happy-dom
// E121b: the Airway & ventilation tab's Oxygen control. Room air by default; choosing a device offers its flows and
// shows the FiO₂ they give; Stage stages ONE oxygen event under its own key (Stage / Apply / Commit like every panel
// action), with the clinical line the log and the Debrief print. It acts only while the patient breathes
// spontaneously with no airway device, bag or ventilator: otherwise it is disabled with the reason, a staged oxygen is
// taken back, and its `source: 'spontaneous'` event is never sent (it would take the patient off the tube or the bag).
import { beforeEach, describe, expect, it } from 'vitest';
import type { Breathing } from '../oxygen.ts';
import type { PanelCtx } from './ctx.ts';
import { airwayTab } from './airway.ts';

const SPONT: Breathing = { source: 'spontaneous', device: 'none' };

function rig(start: Breathing | null = SPONT) {
  const staged: Array<{ c: unknown; key: string; text: string }> = [];
  const state: { breathing: Breathing | undefined; values: { fio2?: number } } = { breathing: start ?? undefined, values: {} };
  let refresh = () => undefined as void;
  const staging = {
    submit: (c: unknown, key: string, text: string) => staged.push({ c, key, text }),
    has: (key: string) => staged.some((s) => s.key === key),
    drop: (key: string) => staged.splice(0, staged.length, ...staged.filter((s) => s.key !== key)),
  };
  const ctx = { link: { ctl: { state } }, staging, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
  const el = airwayTab(ctx);
  document.body.append(el);
  const o2 = el.querySelector<HTMLElement>('[role=group][aria-label=Oxygen]')!;
  const choose = (name: string) => [...o2.querySelectorAll('button')].find((b) => b.textContent === name)!.click();
  const flow = [...el.querySelectorAll<HTMLSelectElement>('select')].find((s) => s.labels?.[0]?.textContent === 'Flow')!;
  const hint = flow.closest('.field')!.nextElementSibling as HTMLElement;
  // the Stage button of the Oxygen section: the first row after its heading
  const oxygenStage = () => {
    let n: Element | null = [...el.querySelectorAll('h3')].find((x) => x.textContent === 'Oxygen')!;
    while (n && !(n.classList.contains('row') && n.querySelector('button')?.textContent === 'Stage')) n = n.nextElementSibling;
    return n!.querySelector('button') as HTMLButtonElement;
  };
  const stageOxygen = () => oxygenStage().click();
  /** The engine's next 1 Hz state reports this breathing; the panel repaints. */
  const breathe = (b: Breathing | undefined, fio2?: number) => ((state.breathing = b), (state.values.fio2 = fio2), refresh());
  /** The state changes and the panel has not repainted yet. */
  const breatheQuiet = (b: Breathing) => void (state.breathing = b);
  return { el, o2, choose, flow, hint, staged, stageOxygen, oxygenStage, breathe, breatheQuiet };
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

  // UI review #13: the control says what is true. Nothing in it is pressed (neither room air nor a mask is in use), and
  // the hint names what is: the airway device or the bag, and the FiO₂ the engine reports, from the ventilator or bag.
  const HELD: Array<[string, Breathing, number, string]> = [
    ['bag-mask', { source: 'bvm', device: 'none' }, 1, 'Bag-mask in use: FiO₂ 100 % from the bag.'],
    ['ventilator', { source: 'ventilator', device: 'ett' }, 0.5, 'Airway device in use (tracheal tube): FiO₂ 50 % from the ventilator.'],
    ['Ventilator view', { source: 'external', device: 'ett' }, 0.4, 'Airway device in use (tracheal tube): FiO₂ 40 % from the ventilator.'],
    ['tracheal tube, breathing spontaneously', { source: 'spontaneous', device: 'ett' }, 0.3, 'Airway device in use (tracheal tube): FiO₂ 30 %.'],
    ['supraglottic airway, breathing spontaneously', { source: 'spontaneous', device: 'sga' }, 0.21, 'Airway device in use (supraglottic airway): FiO₂ 21 %.'],
  ];
  it.each(HELD)('%s: the control is disabled, nothing pressed, the hint says what is in use, and Stage sends nothing', (_, b, fio2, text) => {
    const { o2, flow, hint, staged, oxygenStage, choose, breathe } = rig(SPONT);
    choose('Face mask');
    breathe(b, fio2);
    expect(oxygenStage().disabled).toBe(true);
    expect(flow.disabled).toBe(true);
    expect([...o2.querySelectorAll('button')].every((x) => x.disabled)).toBe(true);
    expect(o2.querySelector('[aria-pressed=true]')).toBeNull();
    expect(hint.textContent).toBe(text);
    oxygenStage().dispatchEvent(new MouseEvent('click')); // even a press that reaches the handler
    oxygenStage().click();
    expect(staged).toEqual([]);
  });

  it('a staged oxygen is taken back when the patient is intubated before Commit; spontaneous again re-enables it', () => {
    const { staged, stageOxygen, oxygenStage, choose, breathe, hint, o2 } = rig();
    choose('Face mask');
    stageOxygen();
    expect(staged.map((s) => s.key)).toEqual(['oxygen']);
    breathe({ source: 'ventilator', device: 'ett' });
    expect(staged).toEqual([]);
    expect(oxygenStage().disabled).toBe(true);
    breathe(SPONT);
    expect(oxygenStage().disabled).toBe(false);
    expect(hint.textContent).toMatch(/^FiO₂ about 60 %/);
    expect(o2.querySelector('[aria-pressed=true]')?.textContent).toBe('Face mask'); // the choice comes back
  });

  it('when the patient’s FiO₂ is not what the control would give, the hint says what it is now (UI review #13)', () => {
    const { hint, breathe } = rig();
    breathe(SPONT, 1); // the card's "Preoxygenate: 100 % O₂ by face mask"
    expect(hint.textContent).toBe('Room air: FiO₂ 21 %. Now FiO₂ 100 %.');
    breathe(SPONT, 0.21);
    expect(hint.textContent).toBe('Room air: FiO₂ 21 %.');
  });

  it('a press between the engine’s new state and the next repaint (button still enabled) sends nothing either', () => {
    const r = rig();
    r.choose('Face mask');
    expect(r.oxygenStage().disabled).toBe(false);
    r.breatheQuiet({ source: 'bvm', device: 'none' });
    r.stageOxygen();
    expect(r.staged).toEqual([]);
    expect(r.hint.textContent).toBe('Bag-mask in use: FiO₂ from the bag.');
  });

  it('before the monitor’s first state, or with a breathing change staged, it waits', () => {
    const r = rig(null);
    expect(r.oxygenStage().disabled).toBe(true);
    expect(r.hint.textContent).toBe('Waiting for the monitor’s state.');
    r.breathe(SPONT);
    r.staged.push({ c: {}, key: 'ventilation', text: 'Ventilator' });
    r.breathe(SPONT);
    expect(r.oxygenStage().disabled).toBe(true);
    expect(r.hint.textContent).toBe('A breathing change is staged: commit it first.');
  });
});
