// @vitest-environment happy-dom
// The instructor's view of the pump rack and its alarm card, from scripted engine rows: every channel of the rack (and
// one the engine runs above it), the programme, the rate or TCI target, the pump's prediction beside the patient's own
// concentrations, a syringe holding another drug than its programme, the amounts given; nothing in it is a control. The
// alarm card stands on the page from the start, shows each standing alarm and announces a new one.
import type { DrugPanelRow, DrugsEvent, PumpPanelRow } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { mountPumpAlarmCard } from '../teach2/pump-alarm-card.ts';
import { PumpAlarmEdges } from '../pump-alarms.ts';
import { othersRunning, pumpsView } from './pumps.ts';

const P10 = { amount: 10, unit: 'mg' as const, perMl: 1 };
const channel = (o: Partial<PumpPanelRow> & { ch: number }): PumpPanelRow => ({
  kind: 'syringe', state: 'running', programmed: { drugId: 'propofol', concentration: P10 }, contents: { drugId: 'propofol', concentration: P10 },
  syringeMl: 50, set: null, mode: 'rate', rate: { rate: 20, unit: 'mL/h' }, rateMlH: 20, limitMl: null, volumeMl: 46, infusedMl: 4, wasteMl: 0,
  timeToEmptyMin: 138, alarms: [], tci: null, ...o,
});
const drug = (o: Partial<DrugPanelRow> & { id: string }): DrugPanelRow => ({ name: o.id, unit: 'mcg/mL', cp: 0, ce: 0, rate: null, rateUnit: null, tci: null, totalAmount: 0, amountUnit: 'mg', decrement50Min: null, ...o });
const event = (pumps: PumpPanelRow[], drugs: DrugPanelRow[]): DrugsEvent => ({ type: 'drugs', t: 100, drugs, volatile: null, macTotal: 0, pumps });

describe('the pump rack view', () => {
  it('each channel of the rack and one above it; programme, rate, infused, state; a mismatch says what the syringe holds', () => {
    const drugs = [drug({ id: 'propofol', cp: 2.4, ce: 3.6, rate: 3.3, rateUnit: 'mg/min', totalAmount: 212 }), drug({ id: 'remifentanil', unit: 'ng/mL', amountUnit: 'mcg', totalAmount: 30, rate: 0.1, rateUnit: 'mcg/min' })];
    const pumps = [
      channel({ ch: 1 }),
      channel({ ch: 2, mode: 'tci', rate: null, tci: { setId: 'eleveld', mode: 'effect', target: 3, cp: 2.1, ce: 2.99, unit: 'mcg/mL' } }),
      channel({ ch: 5, contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 } }, state: 'alarm', alarms: ['end'] }),
    ];
    const v = pumpsView({ drugs: event(pumps, drugs), rack: ['syringe', 'syringe', 'drip', 'syringe'] });
    const items = [...v.el.querySelectorAll('.pumps-ch')] as HTMLElement[];
    expect(items.map((li) => li.querySelector('h4')?.textContent)).toEqual(['Channel 1 · Syringe', 'Channel 2 · Syringe', 'Channel 3 · Drip', 'Channel 4 · Syringe', 'Channel 5 · Syringe']);
    expect(items.map((li) => li.dataset.state)).toEqual(['running', 'running', 'notLoaded', 'notLoaded', 'alarm']);
    expect(items[0]?.textContent).toContain('Propofol 10 mg/mL');
    expect(items[0]?.textContent).toContain('Rate 20 mL/h');
    expect(items[0]?.textContent).toContain('Infused 4 mL · 46 mL left');
    expect(items[2]?.textContent).toContain('Nothing loaded');
    // TCI: the pump's prediction beside the patient's own (plan §9)
    expect(items[1]?.textContent).toContain('TCI Eleveld, Ce target 3 µg/mL');
    expect(items[1]?.querySelector('.pumps-tci')?.textContent).toBe('Predicted Cp 2.1 µg/mL · patient 2.4 µg/mL\nPredicted Ce 2.99 µg/mL · patient 3.6 µg/mL');
    // a syringe of remifentanil programmed as propofol: the truth, in the alarm colour's class
    expect(items[4]?.querySelector('.pumps-holds')?.textContent).toBe('Holds Remifentanil 50 µg/mL: not what it is programmed with');
    expect(items[4]?.querySelector('.pumps-alarm')?.textContent).toBe('Pump channel 5 (Propofol): End');
    expect(items[0]?.querySelector('.pumps-alarm')?.textContent).toBe('No alarm');
    expect([...v.el.querySelectorAll('.pumps-given li')].map((li) => li.textContent)).toEqual(['Propofol: 212 mg', 'Remifentanil: 30 µg']);
    expect(v.el.querySelectorAll('button, input, select')).toHaveLength(0); // a view, not a second pump
    expect(v.el.querySelector('ul.pumps-list')?.getAttribute('aria-label')).toBe('Pump channels');
    expect(items[0]?.getAttribute('aria-labelledby')).toBe(items[0]?.querySelector('h4')?.id);
  });

  it('repaints in place: a channel keeps its node as its numbers move', () => {
    const link = { drugs: event([channel({ ch: 1 })], []), rack: ['syringe'] as const };
    const v = pumpsView(link);
    const first = v.el.querySelector('.pumps-ch');
    link.drugs = event([channel({ ch: 1, infusedMl: 5, volumeMl: 45 })], []);
    v.refresh();
    expect(v.el.querySelector('.pumps-ch')).toBe(first);
    expect(first?.textContent).toContain('Infused 5 mL · 45 mL left');
  });

  it('no rack and no channel: says so', () => {
    const v = pumpsView({ drugs: null, rack: [] });
    expect(v.el.textContent).toContain('This room has no pump rack.');
    expect(v.el.textContent).toContain('No drug given yet.');
  });

  it('the phone\'s running list: an infusion off the pumps, then each running channel', () => {
    const e = event([channel({ ch: 1 }), channel({ ch: 2, state: 'paused' })], [drug({ id: 'propofol', rate: 3.3, rateUnit: 'mg/min' }), drug({ id: 'norepinephrine', rate: 8, rateUnit: 'mcg/min', amountUnit: 'mcg' })]);
    expect(othersRunning(e, new Set())).toEqual(['Norepinephrine 8 µg/min', 'Pump channel 1: Propofol 10 mg/mL, Rate 20 mL/h']);
    expect(othersRunning(e, new Set(['norepinephrine']))).toEqual(['Pump channel 1: Propofol 10 mg/mL, Rate 20 mL/h']);
    expect(othersRunning(null, new Set())).toEqual([]);
  });
});

describe('the pump alarm card', () => {
  it('hidden with no alarm; shows and announces a new one; hides again when it ends', () => {
    const edges = new PumpAlarmEdges();
    const fns = new Set<() => void>();
    const link = { get pumpAlarms() { return edges.now; }, onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)) };
    let opened = 0;
    const card = mountPumpAlarmCard(link, () => void opened++);
    const say = card.el.querySelector('[role="alert"]') as HTMLElement;
    const box = card.el.querySelector('section.ip2-pa') as HTMLElement;
    expect(box.hidden).toBe(true);
    expect(say).not.toBeNull(); // the live region is there before any alarm, so the first one is announced
    edges.rows([]);
    edges.rows([channel({ ch: 3, kind: 'drip', state: 'alarm', alarms: ['infusionComplete'] })]);
    for (const fn of fns) fn();
    expect(box.hidden).toBe(false);
    expect(say.closest('[hidden]')).toBeNull();
    expect([...card.el.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Pump channel 3 (Propofol): Infusion Complete']);
    expect(say.textContent).toBe('Pump channel 3 (Propofol): Infusion Complete');
    (card.el.querySelector('button') as HTMLButtonElement).click();
    expect(opened).toBe(1);
    edges.rows([channel({ ch: 3, kind: 'drip' })]);
    for (const fn of fns) fn();
    expect(box.hidden).toBe(true);
    card.destroy();
  });
});
