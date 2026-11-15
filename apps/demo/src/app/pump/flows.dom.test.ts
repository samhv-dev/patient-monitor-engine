// @vitest-environment happy-dom
// Plan pump-rack-tci.md A2 ("Tests first"; §4 D2, D6, D7, D12; §5 "Buttons"; §8): the channel flows on the pump face.
// Each flow builds exactly one of C1's PUMP_COMMANDS shapes for its channel and sends it through the tablet's follower;
// the face decides nothing the host decides: a refusal shows the HOST's words (the ack's reason) as they came, and
// nothing reads as done before the host's ack. Every range and gap a flow shows is the shipped device profile's (S1),
// none typed into the face. Load lists the preparations' LABELS (the host's `labels` news) and the stock items that fit
// the channel's kind, never what a syringe holds; Program offers the pump's drug list and, on a drip channel, the
// OT-701's set types; Rate offers mL/h, a dose rate in the programme's unit, and drops/min on a drip channel; TCI offers
// only the sets the engine has registered for the programmed drug and asks for the mode and the patient, with "Copy from
// the case sheet" (D6); Bolus and Purge as §5 and D7 state them. English only on the device's face.
import type { WireMessage } from '@pme/controller';
import type { PumpPanelRow } from '@pme/engine-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadShippedFormulary } from '../formulary.ts';
import { FLOW_WORDS, mountFlows, type PumpLink } from './controls.ts';
import { faceProfilesOf, shippedPumpDevices } from './devices.ts';
import { faceRow } from './face-row.ts';
import { rackView } from './rack.ts';

const DEVICES = shippedPumpDevices();
let FORMULARY: Awaited<ReturnType<typeof loadShippedFormulary>> = null;
beforeAll(async () => void (FORMULARY = await loadShippedFormulary()));
const PEER = 'view-pump01';
const DEVICE = 'pumptab0001';
const CASE = { ageY: 52, weightKg: 81, heightCm: 176, sex: 'm' as const };

/** E1's row for channel `ch`: a 20 mL syringe of propofol 10 mg/mL, loaded and programmed, not started. */
const row = (o: Partial<PumpPanelRow> = {}): PumpPanelRow => ({
  ch: 2, kind: 'syringe', state: 'loaded',
  programmed: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
  contents: { drugId: 'remifentanil', concentration: { amount: 37, unit: 'mcg', perMl: 1 } },
  syringeMl: 20, set: null, mode: 'rate', rate: null, rateMlH: 0, limitMl: null,
  volumeMl: 20, infusedMl: 0, wasteMl: 0, timeToEmptyMin: null, alarms: [], tci: null,
  ...o,
});
/** The host's labels of two preparations of learner remote `bed2remote01`: a propofol syringe and a norepinephrine bag. */
const LABELS = {
  news: 'labels',
  labels: [
    { device: 'bed2remote01', id: 'p1', container: 'syringe-pp', drugId: 'propofol', actives: [{ drugId: 'propofol', amount: 10, unit: 'mg', perMl: 1 }], volumeMl: 20, madeAt: 312, readyAt: 312 },
    { device: 'bed2remote01', id: 'p2', container: 'bag-pvc', drugId: 'norepinephrine', actives: [{ drugId: 'norepinephrine', amount: 0.016, unit: 'mg', perMl: 1 }], volumeMl: 250, madeAt: 400, readyAt: 460 },
  ],
};

function setup(kinds: Array<'syringe' | 'drip'> = ['syringe', 'syringe', 'drip', 'syringe']) {
  const rack = rackView({ profiles: faceProfilesOf(DEVICES) });
  document.body.replaceChildren(rack.el);
  rack.setKinds(kinds);
  const sent: Array<Record<string, unknown>> = [];
  const fns = new Set<(m: WireMessage) => void>();
  let n = 0;
  const link: PumpLink = {
    peerId: PEER,
    device: DEVICE,
    command: (body) => (sent.push(body), `${PEER}-c${++n}`),
    onMessage: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    casePatient: () => Promise.resolve(CASE),
  };
  const flows = mountFlows(rack, link, { devices: DEVICES, formulary: () => FORMULARY });
  const say = (m: Record<string, unknown>) => [...fns].forEach((fn) => fn(m as unknown as WireMessage));
  const news = (body: unknown) => say({ kind: 'event', body: [{ type: 'prep', t: 500, to: PEER, body }] });
  const ack = (i: number, accepted: boolean, reason?: string) => say({ kind: 'ack', commandId: `${PEER}-c${i}`, accepted, tick: 1, ...(reason ? { reason } : {}) });
  const face = (ch: number) => rack.el.querySelector<HTMLElement>(`.pump-face[data-ch="${ch}"]`) as HTMLElement;
  const open = (ch: number, flow: string) => (face(ch).querySelector<HTMLButtonElement>(`.pf-btn[data-flow="${flow}"]`) as HTMLButtonElement).click();
  const form = (ch: number) => face(ch).querySelector<HTMLFormElement>('.pf-flow:not([hidden])') as HTMLFormElement;
  const send = (ch: number) => (form(ch).querySelector('.pf-send') as HTMLButtonElement).click();
  const said = (ch: number) => face(ch).querySelector('.pf-said')?.textContent ?? '';
  const sel = (ch: number, name: string) => form(ch).querySelector<HTMLSelectElement>(`select[name="${name}"]`) as HTMLSelectElement;
  const inp = (ch: number, name: string) => form(ch).querySelector<HTMLInputElement>(`input[name="${name}"]`) as HTMLInputElement;
  const set = (el: HTMLInputElement | HTMLSelectElement, v: string) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const hints = (ch: number) => [...form(ch).querySelectorAll('.pf-hint')].map((e) => e.textContent).join(' | ');
  const options = (s: HTMLSelectElement) => [...s.options].map((o) => [o.value, o.textContent]);
  return { rack, flows, sent, news, ack, face, open, form, send, said, sel, inp, set, hints, options };
}

describe('the buttons (§5): a drip channel has no TCI and no Bolus', () => {
  it('syringe channels: Load, Program, Rate, TCI, Bolus, Start, Purge, Unload; drip: no TCI, no Bolus', () => {
    const t = setup();
    const flows = (ch: number) => [...t.face(ch).querySelectorAll<HTMLElement>('.pf-btn:not([hidden])')].map((b) => b.dataset.flow);
    expect(flows(1)).toEqual(['load', 'program', 'rate', 'tci', 'bolus', 'start', 'purge', 'unload']);
    expect(flows(3)).toEqual(['load', 'program', 'rate', 'start', 'purge', 'unload']);
    // Start or Stop follows the channel's own state, from the follower engine
    t.rack.update([faceRow(row({ state: 'running', rate: { rate: 5, unit: 'mL/h' }, rateMlH: 5 }))]);
    expect(t.face(2).querySelector('.pf-btn[data-flow="start"]')?.textContent).toBe('Stop');
    expect(t.face(1).querySelector('.pf-btn[data-flow="start"]')?.textContent).toBe('Start');
    for (const b of t.rack.el.querySelectorAll('.pf-btn')) expect((b as HTMLButtonElement).type).toBe('button');
  });
});

describe('Load (D2 item 1, §8): the labels and the stock items that fit the channel, never the contents', () => {
  it('a syringe channel lists the syringe preparations by their labels and the stock syringes; a drip channel the bags', async () => {
    const t = setup();
    t.news(LABELS);
    t.open(2, 'load');
    const s = t.sel(2, 'source');
    expect(t.options(s)).toEqual([
      ['prep|bed2remote01|p1', 'Propofol 10 mg/mL · 20 mL · made on bed2remote01 at 05:12'],
      ['stock|propofol-10mg-ml-50ml', 'Propofol 10 mg/mL · 50 mL · stock'],
      ['stock|propofol-10mg-ml-20ml', 'Propofol 10 mg/mL · 20 mL · stock'],
      ['stock|phenylephrine-100mcg-ml-20ml', 'Phenylephrine 100 µg/mL · 20 mL · stock'],
    ]);
    t.open(3, 'load');
    expect(t.options(t.sel(3, 'source'))).toEqual([['prep|bed2remote01|p2', 'Norepinephrine 0.016 mg/mL · 250 mL · made on bed2remote01 at 06:40']]);
  });

  it('sends the preparation by its maker and id (the host resolves what it holds); "Sent" until the host answers, then its words', () => {
    const t = setup();
    t.news(LABELS);
    t.open(2, 'load');
    t.send(2);
    expect(t.sent).toEqual([{ type: 'pump', ch: 2, action: 'load', syringe: { prep: { device: 'bed2remote01', id: 'p1' } } }]);
    expect(t.said(2)).toBe(FLOW_WORDS.sent);
    expect(t.said(2)).not.toMatch(/loaded|delivered|running/i);
    t.ack(1, true);
    expect(t.said(2)).toBe('Loaded on channel 2.');
    t.open(3, 'load');
    t.send(3);
    expect(t.sent[1]).toEqual({ type: 'pump', ch: 3, action: 'load', bag: { prep: { device: 'bed2remote01', id: 'p2' } } });
    t.ack(2, false, 'not ready yet (0:42)');
    expect(t.said(3)).toBe('Refused by the instructor\'s computer: not ready yet (0:42)');
  });

  it('a stock syringe by its id; nothing to load is said, and nothing is sent', () => {
    const t = setup();
    t.open(1, 'load');
    t.set(t.sel(1, 'source'), 'stock|propofol-10mg-ml-20ml');
    t.send(1);
    expect(t.sent).toEqual([{ type: 'pump', ch: 1, action: 'load', syringe: { stock: 'propofol-10mg-ml-20ml' } }]);
    t.open(3, 'load'); // a drip channel: no bag prepared, and the stock list has no bag
    t.send(3);
    expect(t.sent).toHaveLength(1);
    expect(t.said(3)).toBe('No bag to load: prepare one on a learner remote\'s bench.');
  });

  it("the page never holds a syringe's true contents (the engine row's remifentanil)", () => {
    const t = setup();
    t.news(LABELS);
    t.rack.update([faceRow(row())]);
    for (const f of ['load', 'program', 'rate', 'tci', 'bolus', 'purge']) {
      t.open(2, f);
      expect(document.body.innerHTML).not.toMatch(/37 (µg|mcg)/);
    }
  });
});

describe('Program (D2 item 2): the pump\'s drug list; the IV set on a drip channel, from the OT-701 profile', () => {
  it('a syringe channel: drug and concentration, no set', () => {
    const t = setup();
    t.open(1, 'program');
    const drugs = t.options(t.sel(1, 'drugId')).map(([v]) => v);
    expect(drugs).toContain('propofol');
    expect(drugs).toContain('remifentanil');
    expect(drugs).not.toContain('sevoflurane'); // a volatile agent is not a pump's
    expect(t.form(1).querySelector('select[name="set"]')).toBeNull();
    t.set(t.sel(1, 'drugId'), 'propofol');
    t.set(t.inp(1, 'amount'), '10');
    expect(t.sel(1, 'unit').value).toBe('mg'); // the drug's own amount unit
    t.send(1);
    expect(t.sent).toEqual([{ type: 'pump', ch: 1, action: 'program', drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } }]);
  });

  it('a drip channel: the OT-701\'s three set types; no amount typed is said, not sent', () => {
    const t = setup();
    t.open(3, 'program');
    expect(t.options(t.sel(3, 'set'))).toEqual([['15', '15 drops/mL'], ['20', '20 drops/mL'], ['60', '60 drops/mL']]);
    t.set(t.sel(3, 'drugId'), 'norepinephrine');
    t.send(3);
    expect(t.sent).toEqual([]);
    expect(t.said(3)).toBe(FLOW_WORDS.missing('the concentration'));
    expect(t.sel(3, 'unit').value).toBe('mcg'); // the drug's own amount unit; the learner may choose another
    t.set(t.inp(3, 'amount'), '4');
    t.set(t.sel(3, 'unit'), 'mg');
    t.set(t.inp(3, 'perMl'), '250');
    t.set(t.sel(3, 'set'), '20');
    t.send(3);
    expect(t.sent).toEqual([{ type: 'pump', ch: 3, action: 'program', drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, set: 20 }]);
  });
});

describe('Rate (D2 item 3, D12): mL/h, a dose rate, drops/min on a drip channel; the range is the profile\'s words', () => {
  it('a syringe channel with a 20 mL syringe: the SP-500\'s range for that size; a dose rate says its gap', () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    t.open(2, 'rate');
    const units = t.options(t.sel(2, 'unit')).map(([v]) => v);
    expect(units[0]).toBe('mL/h');
    expect(units).toContain('mg/kg/h');
    expect(units).not.toContain('drops/min');
    expect(t.hints(2)).toBe('JMS SP-500: 0.1–300 mL/h with a 20 mL syringe, in 0.1 mL/h steps');
    t.set(t.inp(2, 'rate'), '12.5');
    t.send(2);
    expect(t.sent).toEqual([{ type: 'pump', ch: 2, action: 'rate', rate: 12.5, unit: 'mL/h' }]);
    // a per-kg dose rate asks for the weight typed into the pump, and the profile's gap is said, not filled
    t.open(2, 'rate');
    t.set(t.sel(2, 'unit'), 'mg/kg/h');
    expect(t.hints(2)).toMatch(/dose-rate limits not set from the manual$/);
    t.set(t.inp(2, 'rate'), '6');
    t.send(2);
    expect(t.sent).toHaveLength(1);
    expect(t.said(2)).toBe(FLOW_WORDS.missing('the weight'));
    t.set(t.inp(2, 'weightKg'), '81');
    t.send(2);
    expect(t.sent[1]).toEqual({ type: 'pump', ch: 2, action: 'rate', rate: 6, unit: 'mg/kg/h', weightKg: 81 });
    t.ack(2, false, '486 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 20 mL syringe, in 0.1 mL/h steps');
    expect(t.said(2)).toBe("Refused by the instructor's computer: 486 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 20 mL syringe, in 0.1 mL/h steps");
  });

  it('a drip channel on a 20 drops/mL set: drops/min, the OT-701\'s ranges, its drops step a gap; a volume limit', () => {
    const t = setup();
    t.rack.update([faceRow(row({ ch: 3, kind: 'drip', syringeMl: null, set: 20, programmed: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 } } }))]);
    t.open(3, 'rate');
    expect(t.options(t.sel(3, 'unit')).map(([v]) => v)).toContain('drops/min');
    t.set(t.sel(3, 'unit'), 'drops/min');
    expect(t.hints(3)).toBe('JMS OT-701: 1–450 mL/h or 1–100 drops/min with a 20 drops/mL set; drops/min step not set from the manual | Volume limit 1–9999 mL, or none');
    t.set(t.inp(3, 'rate'), '30');
    t.set(t.inp(3, 'limitMl'), '100');
    t.send(3);
    expect(t.sent).toEqual([{ type: 'pump', ch: 3, action: 'rate', rate: 30, unit: 'drops/min', limitMl: 100 }]);
  });

  it('before a syringe is loaded the range is per syringe size, said from the profile', () => {
    const t = setup();
    t.open(1, 'rate');
    expect(t.hints(1)).toBe('JMS SP-500: the range depends on the syringe (10, 20, 30 and 50 mL): load one first');
  });
});

describe('TCI (D2 item 4, D6, §6): the registered sets for the programmed drug, the mode, the patient', () => {
  it('offers only the propofol sets; copies the case sheet; sends set, mode, target and the typed patient', async () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    t.open(2, 'tci');
    const sets = t.options(t.sel(2, 'setId')).map(([v]) => v);
    expect(sets).toContain('eleveld');
    expect(sets).toContain('schnider');
    expect(sets).not.toContain('minto'); // remifentanil's
    expect(t.form(2).textContent).toContain('Target (µg/mL)');
    (t.form(2).querySelector('.pf-copy') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
    expect([t.inp(2, 'ageY').value, t.inp(2, 'weightKg').value, t.inp(2, 'heightCm').value, t.sel(2, 'sex').value]).toEqual(['52', '81', '176', 'm']);
    t.set(t.sel(2, 'setId'), 'eleveld');
    t.set(t.sel(2, 'mode'), 'effect');
    t.set(t.inp(2, 'target'), '3');
    t.send(2);
    expect(t.sent).toEqual([{ type: 'pump', ch: 2, action: 'tci', setId: 'eleveld', mode: 'effect', target: 3, patient: { ageY: 52, weightKg: 81, heightCm: 176, sex: 'm' } }]);
    t.ack(1, true);
    expect(t.said(2)).toBe('Target set on channel 2: press Start to run it.');
  });

  it('a value outside the studied population shows the paper\'s range and is still sent (D6); the SP5 gaps are said', () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    t.open(2, 'tci');
    t.set(t.sel(2, 'setId'), 'schnider');
    t.set(t.inp(2, 'ageY'), '95');
    expect(t.hints(2)).toMatch(/Age 95 y is outside the population Schnider \(propofol\) was studied in \(26–81 y/);
    expect(t.hints(2)).toContain('patient limits not set from the manual');
    expect(t.hints(2)).toContain('target range not set from the manual');
    for (const [k, v] of [['weightKg', '70'], ['heightCm', '170'], ['target', '4']] as const) t.set(t.inp(2, k), v);
    t.send(2);
    expect(t.sent).toEqual([]); // the sex is the learner's to choose: none is assumed
    expect(t.said(2)).toBe(FLOW_WORDS.missing('the sex'));
    t.set(t.sel(2, 'sex'), 'f');
    t.send(2);
    expect(t.sent[0]).toMatchObject({ action: 'tci', setId: 'schnider', patient: { ageY: 95 } });
  });

  it('nothing programmed: the face says what TCI needs, and sends nothing', () => {
    const t = setup();
    t.open(1, 'tci');
    expect(t.form(1).textContent).toContain('Program the drug first');
    t.send(1);
    expect(t.sent).toEqual([]);
  });
});

describe('Bolus (D2 item 5) and Purge (D7)', () => {
  it('a bolus by volume at the syringe size\'s rapid rate, its volume limit a gap', () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    t.open(2, 'bolus');
    expect(t.hints(2)).toBe('JMS SP-500: given at about 350 mL/h with a 20 mL syringe; bolus volume limit not set from the manual');
    t.set(t.inp(2, 'amount'), '2');
    t.send(2);
    expect(t.sent).toEqual([{ type: 'pump', ch: 2, action: 'bolus', volumeMl: 2 }]);
    t.open(2, 'bolus');
    t.set(t.sel(2, 'unit'), 'mg');
    t.set(t.inp(2, 'amount'), '20');
    t.send(2);
    expect(t.sent[1]).toEqual({ type: 'pump', ch: 2, action: 'bolus', dose: { amount: 20, unit: 'mg' } });
  });

  it('a purge: at most 2 mL on the face (the manual\'s limit not read, D7), at the device\'s rate; into the patient once it has delivered', () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    t.open(2, 'purge');
    expect(t.hints(2)).toBe('JMS SP-500: at about 350 mL/h with a 20 mL syringe; at most 2 mL on this face: purge limit not set from the manual | Nothing delivered yet: the purge primes the line, to waste');
    t.set(t.inp(2, 'volumeMl'), '3');
    t.send(2);
    expect(t.sent).toEqual([]);
    expect(t.said(2)).toBe('At most 2 mL on this face: purge limit not set from the manual.');
    t.set(t.inp(2, 'volumeMl'), '1');
    t.send(2);
    expect(t.sent).toEqual([{ type: 'pump', ch: 2, action: 'purge', volumeMl: 1 }]);
    t.rack.update([faceRow(row({ ch: 3, kind: 'drip', syringeMl: null, set: 20, infusedMl: 4, state: 'paused' }))]);
    t.open(3, 'purge');
    expect(t.hints(3)).toBe('JMS OT-701: at more than 450 mL/h; at most 2 mL on this face: purge limit not set from the manual | The line is connected: a purge now goes into the patient');
  });
});

describe('Start, Stop and Unload; the mismatch notice; the words', () => {
  it('Start, then Stop once the engine runs it, and Unload, each one command', () => {
    const t = setup();
    t.rack.update([faceRow(row())]);
    const press = (f: string) => (t.face(2).querySelector(`.pf-btn[data-flow="${f}"]`) as HTMLButtonElement).click();
    press('start');
    t.ack(1, true);
    expect(t.said(2)).toBe('Started on channel 2.');
    t.rack.update([faceRow(row({ state: 'running', rate: { rate: 5, unit: 'mL/h' }, rateMlH: 5 }))]);
    press('start');
    press('unload');
    expect(t.sent.map((c) => c.action)).toEqual(['start', 'stop', 'unload']);
    expect(t.sent.every((c) => c.type === 'pump' && c.ch === 2 && Object.keys(c).length === 3)).toBe(true);
  });

  it("the instructor's mismatch notice shows on its channel only, in the host's words", () => {
    const t = setup();
    t.news({ news: 'mismatch', ch: 2, words: 'syringe and programme differ' });
    const n = t.face(2).querySelector<HTMLElement>('.pf-notice') as HTMLElement;
    expect(n.hidden).toBe(false);
    expect(n.textContent).toBe('syringe and programme differ');
    expect((t.face(1).querySelector('.pf-notice') as HTMLElement).hidden).toBe(true);
  });

  it('English only on the face, left to right; every control a button or a labelled field', () => {
    const t = setup();
    t.news(LABELS);
    t.rack.update([faceRow(row())]);
    for (const f of ['load', 'program', 'rate', 'tci', 'bolus', 'purge']) {
      t.open(2, f);
      expect(t.face(2).textContent).not.toMatch(/[؀-ۿ]/);
      for (const c of t.form(2).querySelectorAll('input, select')) expect(c.id && t.form(2).querySelector(`label[for="${c.id}"]`), `${f} ${c.getAttribute('name')}`).toBeTruthy();
    }
    expect(t.face(2).getAttribute('lang')).toBe('en');
  });

  it('destroy takes the controls off the faces and stops listening', () => {
    const t = setup();
    t.flows.destroy();
    expect(t.rack.el.querySelector('.pf-btn')).toBeNull();
  });
});
