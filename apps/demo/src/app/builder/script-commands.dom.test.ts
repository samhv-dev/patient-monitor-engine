// @vitest-environment happy-dom
// Piece 162 (finding N83 of B5; docs/plans/scenario-builder.md §5.2): the Script section adds and edits the Airway,
// Defib · CPR and Devices sheets' commands. (1) For the same input, the builder's form and the sheet's own controls
// produce EQUAL commands (both call the sheet's builders; this proves it through the DOM of each). (2) The form's limits
// are the sheet's steppers' limits, read from the sheet's DOM, and a number outside them is refused in place. (3) Every
// command of the library that the form can say is read into it and built back to the same command, and an untouched
// edit keeps the card's very object; the commands it cannot say are named and stay as the card has them. (4) Through
// the page, a card scripting every such kind is drawn, touched, edited untouched and exported byte-identical, and a new
// entry of each kind is accepted by the validator. (5) Brief 174: the five kinds the format gained (a lung condition,
// by the Airway sheet's builder; a TCI, a mainstem, a recruitment and a lab sample, by the physiology console's, the
// wire's commands), refused in place in the validator's words, and the library unchanged.
import { DRUG_IDS, LAB_PANELS } from '@pme/engine-core';
import { ENGINE_CHECKED_KINDS, eventRefusal, validateScenario } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { airwayTab } from '../panel/airway.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { defibTab } from '../panel/defib.ts';
import { devicesTab } from '../panel/devices.ts';
import { DEFAULT_SITE } from '../site.ts';
import { LIBRARY } from '../scenarios.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import { lab, mainstem, recruit, tci } from '../../physiology-console/actions.ts';
import { commandForm } from './action-editor.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { Drafts, type Body } from './drafts.ts';
import { docOf, formOf } from './form.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';
import { edited, seedOf } from './script-commands.ts';
import { CARD_SET, scriptSection } from './script-editor.ts';

type Rec = Record<string, unknown>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MH = mhCard as unknown as Rec;
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

/** A sheet mounted with a fake context: what it stages and what it sends now. */
function sheetRig(body: (c: PanelCtx) => HTMLElement) {
  const out: unknown[] = [];
  const staging = { submit: (c: unknown) => out.push(c), has: () => false, drop: () => undefined };
  const link = { ctl: { state: { breathing: { source: 'spontaneous', device: 'none' }, values: {} } }, device: null, alarms: null, host: null, simT: 0, send: async (c: CommandInput) => (out.push(c), OK), onChange: () => () => undefined };
  const ctx = { link, staging, site: { ...DEFAULT_SITE, defibModel: null }, weightKg: () => 70, onRefresh: () => undefined, goTab: () => undefined } as unknown as PanelCtx;
  const el = body(ctx);
  document.body.append(el);
  const btns = (name: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent === name);
  const after = (heading: string, name: string) => {
    // the button named `name` in the section under the heading
    let n: Element | null = [...el.querySelectorAll('h3')].find((x) => x.textContent === heading)!;
    for (n = n.nextElementSibling; n && n.tagName !== 'H3'; n = n.nextElementSibling) {
      const b = [...n.querySelectorAll<HTMLButtonElement>('button')].find((x) => x.textContent === name) ?? (n.tagName === 'BUTTON' && n.textContent === name ? (n as HTMLButtonElement) : null);
      if (b) return b;
    }
    throw new Error(`no ${name} under ${heading}`);
  };
  const seg = (group: string, v: string) => el.querySelector<HTMLButtonElement>(`[role=group][aria-label="${group}"] button[data-v="${v}"]`)!.click();
  const step = (label: string, v: number) => {
    const i = el.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    i.value = String(v);
    i.dispatchEvent(new Event('change'));
  };
  const choose = (label: string, v: string) => {
    const s = [...el.querySelectorAll<HTMLSelectElement>('select')].find((x) => x.labels?.[0]?.textContent === label)!;
    s.value = v;
    s.dispatchEvent(new Event('change'));
  };
  const limits = (label: string) => {
    const i = el.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    return { min: i.min, max: i.max };
  };
  return { el, out, btns, after, seg, step, choose, limits, settle: () => wait(0) };
}

/** The builder's command form with the script's items: what it adds. */
function formRig() {
  const out: Rec[] = [];
  const el = commandForm({ add: (c) => out.push(c), cancel: () => undefined, addWords: 'Add', sends: 'Sends', more: CARD_SET });
  document.body.append(el);
  const by = <T extends HTMLElement = HTMLInputElement>(l: string) => el.querySelector<T>(`[aria-label="New command: ${l}"]`)!;
  const set = (l: string, v: string) => {
    const x = by<HTMLInputElement | HTMLSelectElement>(l);
    x.value = v;
    x.dispatchEvent(new Event(x.tagName === 'SELECT' ? 'change' : 'input'));
  };
  const add = () => {
    const b = [...el.querySelectorAll<HTMLButtonElement>('button')].find((x) => x.textContent === 'Add')!;
    if (b.disabled) throw new Error(`Add is waiting: ${el.textContent}`);
    b.click();
    return out.at(-1);
  };
  return { el, by, set, add };
}

beforeEach(() => document.body.replaceChildren());

describe('the same input, the same command: the builder’s form and the sheet’s own controls', () => {
  it('Airway sheet: an airway state, the ventilator and the bag with their settings, spontaneous breathing, oxygen', async () => {
    for (const state of ['bronchospasm', 'oesophageal', 'patent']) {
      const s = sheetRig(airwayTab);
      s.choose('Airway', state);
      s.after('Airway', 'Stage').click();
      const f = formRig();
      f.set('what', `airway:${state}`);
      expect(f.add()).toEqual(s.out[0]);
    }
    for (const [source, rr, vt, peep, fio2] of [['ventilator', 14, 450, 8, 60], ['bvm', 10, 500, 5, 100], ['ventilator', 4, 50, 0, 21], ['ventilator', 40, 1000, 25, 100]] as const) {
      const s = sheetRig(airwayTab);
      s.seg('Breathing', source);
      s.step('Rate (/min)', rr);
      s.step('Tidal volume (mL)', vt);
      s.step('PEEP (cmH₂O)', peep);
      s.step('FiO₂ (%)', fio2);
      s.after('Breathing', 'Stage').click();
      const f = formRig();
      f.set('what', `vent:${source}`);
      f.set('Rate (/min)', String(rr));
      f.set('Tidal volume (mL)', String(vt));
      f.set('PEEP (cmH₂O)', String(peep));
      f.set('FiO₂ (%)', String(fio2));
      expect(f.add()).toEqual(s.out[0]);
    }
    {
      const s = sheetRig(airwayTab);
      s.seg('Breathing', 'spontaneous');
      s.after('Breathing', 'Stage').click();
      const f = formRig();
      f.set('what', 'vent:spontaneous');
      expect(f.add()).toEqual(s.out[0]);
      expect(s.out[0]).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous' } });
    }
    for (const [dev, flow] of [['mask', '8'], ['nasal', '3'], ['none', '0']] as const) {
      const s = sheetRig(airwayTab);
      s.seg('Oxygen', dev);
      if (dev !== 'none') s.choose('Flow', flow);
      s.after('Oxygen', 'Stage').click();
      const f = formRig();
      f.set('what', `o2:${dev}`);
      if (dev !== 'none') f.set('Flow', flow);
      expect(f.add()).toEqual(s.out[0]);
    }
  });

  it('Defib · CPR sheet: charge and shock at an energy, disarm, synchronised on and off, the pacer, CPR started and stopped', async () => {
    const s = sheetRig(defibTab);
    s.step('Energy (J)', 150);
    s.btns('Charge')[0]!.click();
    s.btns('Shock')[0]!.click();
    s.btns('Disarm')[0]!.click();
    s.btns('Synchronised')[0]!.click();
    s.btns('Synchronised')[0]!.click();
    s.seg('Pacer mode', 'fixed');
    s.step('Pacing rate (/min)', 80);
    s.step('Pacing current (mA)', 90);
    s.after('Pacing', 'Stage').click();
    s.step('Compression rate (/min)', 100);
    s.seg('Compression quality', '1');
    s.btns('Start CPR')[0]!.click();
    s.btns('Stop CPR')[0]!.click();
    await s.settle();
    const f = formRig();
    const built: unknown[] = [];
    f.set('what', 'defib:charge');
    f.set('Energy (J)', '150');
    built.push(f.add());
    f.set('what', 'defib:shock');
    f.set('Energy (J)', '150');
    built.push(f.add());
    for (const a of ['disarm', 'syncOn', 'syncOff']) {
      f.set('what', `defib:${a}`);
      built.push(f.add());
    }
    f.set('what', 'pacer:fixed');
    f.set('Pacing rate (/min)', '80');
    f.set('Pacing current (mA)', '90');
    built.push(f.add());
    f.set('what', 'cpr:start');
    f.set('Compression rate (/min)', '100');
    f.set('Compression quality', '1');
    built.push(f.add());
    f.set('what', 'cpr:stop');
    built.push(f.add());
    expect(built).toEqual(s.out);
    expect(s.out).toHaveLength(8);
  });

  it('Devices sheet: a sensor attached and removed (a line as none), the NIBP now, on an interval and manual', async () => {
    const s = sheetRig(devicesTab);
    for (const name of ['CO₂ sampling line', 'Arterial line']) {
      const t = s.btns(name)[0]!;
      t.click(); // from off: attached
      t.click(); // removed
    }
    s.btns('Start NIBP now')[0]!.click();
    s.choose('Automatic interval', '3');
    s.choose('Automatic interval', '0');
    await s.settle();
    const f = formRig();
    const built: unknown[] = [];
    for (const id of ['co2', 'abp']) {
      for (const on of ['on', 'off']) {
        f.set('what', `sensor:${id}`);
        f.set('Sensor', on);
        built.push(f.add());
      }
    }
    f.set('what', 'nibp:start');
    built.push(f.add());
    for (const v of ['3', '0']) {
      f.set('what', 'nibp:interval');
      f.set('Automatic interval', v);
      built.push(f.add());
    }
    expect(built).toEqual(s.out);
    expect(s.out).toHaveLength(7);
  });
});

describe('the form’s limits are the sheet’s steppers’, and a number outside them is refused in place', () => {
  it('read from the sheet’s own inputs', () => {
    const pairs: Array<[(c: PanelCtx) => HTMLElement, string, string[]]> = [
      [airwayTab, 'vent:ventilator', ['Rate (/min)', 'Tidal volume (mL)', 'PEEP (cmH₂O)', 'FiO₂ (%)']],
      [defibTab, 'defib:shock', ['Energy (J)']],
      [defibTab, 'pacer:demand', ['Pacing rate (/min)', 'Pacing current (mA)']],
      [defibTab, 'cpr:start', ['Compression rate (/min)']],
    ];
    for (const [body, what, labels] of pairs) {
      const s = sheetRig(body);
      const f = formRig();
      f.set('what', what);
      for (const l of labels) expect({ l, ...f.by(l) && { min: f.by(l).min, max: f.by(l).max } }).toEqual({ l, ...s.limits(l) });
    }
  });

  it('a rate of 41 /min is not written: the field says the sheet’s limits and Add waits', () => {
    const f = formRig();
    f.set('what', 'vent:ventilator');
    f.set('Rate (/min)', '41');
    expect(f.el.textContent).toContain('Rate: a whole number from 4 to 40 /min, the sheet’s limits: not written');
    expect(f.by('Rate (/min)').getAttribute('aria-invalid')).toBe('true');
    expect([...f.el.querySelectorAll('button')].find((x) => x.textContent === 'Add')!.disabled).toBe(true);
    expect(f.el.textContent).toContain('Waits for every number.');
    f.set('Rate (/min)', '12.5'); // the sheet's stepper holds whole numbers
    expect(f.el.textContent).toContain('not written');
    f.set('Rate (/min)', '40');
    expect(f.el.textContent).not.toContain('not written');
    expect(f.el.textContent).toContain('Sends: Ventilator: RR 40 /min, VT 500 mL, PEEP 5 cmH₂O, FiO₂ 50 %');
    expect(f.add()).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 40, vtMl: 500, peep: 5, fio2: 0.5 } });
  });
});

/** Every command of a card, wherever it sits (a /2 card's script and press, a /1 card's states and steps). */
function commandsOf(x: unknown, out: Rec[] = []): Rec[] {
  if (Array.isArray(x)) for (const y of x) commandsOf(y, out);
  else if (x && typeof x === 'object') {
    const r = x as Rec;
    if (typeof r.type === 'string' && ['applyEvent', 'attachSensor', 'device', 'setRhythm', 'setTarget', 'pin', 'release', 'setFactor', 'setMode', 'setModifiers'].includes(r.type) && ('event' in r || 'sensor' in r || 'action' in r || 'rhythm' in r || 'variable' in r || 'mode' in r || 'input' in r || 'modifiers' in r)) out.push(r);
    else for (const v of Object.values(r)) commandsOf(v, out);
  }
  return out;
}
const kindOf = (c: Rec) => (c.type === 'applyEvent' ? `applyEvent/${String((c.event as Rec).kind)}` : c.type === 'device' ? `device/${String((c.action as Rec).device)}` : String(c.type));

describe('the library’s commands read back: built again to the same command, or named and kept', () => {
  const all = LIBRARY.flatMap((card) => commandsOf(card.doc).map((c) => ({ card: card.id, c })));
  const SHEET_KINDS = ['applyEvent/airway', 'applyEvent/ventilation', 'applyEvent/defib', 'applyEvent/pacer', 'applyEvent/cpr', 'attachSensor', 'device/nibp'];

  it('every command the form reads is built back to its content, and an untouched edit keeps the card’s own object', () => {
    let n = 0;
    for (const { c } of all) {
      const seed = seedOf(c, CARD_SET.build);
      if (!seed) continue;
      n++;
      const [kind, id] = seed.what.split(':') as [string, string];
      const back = CARD_SET.build(kind, id, { ...seed.st })!;
      expect(edited(c, back)).toBe(c);
    }
    expect(n).toBeGreaterThan(50);
  });

  it('of the sheets’ kinds, these are kept as the card has them (the sheet’s form does not build them); every other is editable', () => {
    const kept = all.filter(({ c }) => SHEET_KINDS.includes(kindOf(c)) && !seedOf(c, CARD_SET.build)).map(({ card, c }) => {
      const { $comment: _, ...bare } = c;
      return `${card}: ${JSON.stringify(bare)}`;
    });
    expect(kept.sort()).toEqual([
      // the bag without a PEEP (the sheet always sends one)
      'showcase-induction: {"type":"applyEvent","event":{"kind":"ventilation","source":"bvm","rr":12,"vtMl":500,"fio2":1}}',
      // an airway state with a severity (the sheet sends the state alone)
      'showcase-bronchospasm: {"type":"applyEvent","event":{"kind":"airway","state":"bronchospasm","severity":1}}',
      // spontaneous breathing at a FiO₂ with no oxygen device (the sheet's oxygen names its device)
      'showcase-tamponade: {"type":"applyEvent","event":{"kind":"ventilation","source":"spontaneous","fio2":0.5}}',
    ].sort());
    const editable = all.filter(({ c }) => SHEET_KINDS.includes(kindOf(c)) && seedOf(c, CARD_SET.build));
    expect(Object.fromEntries(SHEET_KINDS.map((k) => [k, editable.filter(({ c }) => kindOf(c) === k).length]))).toEqual({
      'applyEvent/airway': 0, 'applyEvent/ventilation': 28, 'applyEvent/defib': 0, 'applyEvent/pacer': 0, 'applyEvent/cpr': 16, attachSensor: 0, 'device/nibp': 2,
    });
  });

  it('the kinds no sheet form builds stay as the card has them (for the converter, B7)', () => {
    const none = [...new Set(all.filter(({ c }) => !seedOf(c, CARD_SET.build)).map(({ c }) => kindOf(c)))].sort();
    expect(none).toEqual(['applyEvent/airway', 'applyEvent/airwayDevice', 'applyEvent/bleed', 'applyEvent/condition', 'applyEvent/drug', 'applyEvent/fluid', 'applyEvent/infusion', 'applyEvent/preoxygenate', 'applyEvent/stimulus',
      'applyEvent/vaporiser', 'applyEvent/ventilation', 'device/depth', 'device/tof', 'setRhythm', 'setTarget']);
  });
});

describe('brief 174: the five kinds the format gained, in the Script’s form', () => {
  it('a lung condition: the form and the Airway sheet’s own controls build the same command (severities, sides, Remove)', () => {
    for (const [id, sev, side] of [['bronchospasm', '1', ''], ['ards', '0.33', ''], ['effusion', '0.67', 'L'], ['ptxTension', '1', 'R'], ['atelectasis', '0.67', '']] as const) {
      for (const button of ['Stage', 'Remove']) {
        const s = sheetRig(airwayTab);
        s.choose('Condition', id);
        s.seg('Severity', sev);
        if (side) s.seg('Side', side);
        s.after('Lung condition', button).click();
        const f = formRig();
        f.set('what', `lung:${id}`);
        f.set('Severity', button === 'Remove' ? '0' : sev);
        if (side) f.set('Side', side);
        expect(f.add()).toEqual(s.out[0]);
      }
    }
    // the sheet's conditions are the form's, in its words
    const s = sheetRig(airwayTab);
    const sheetIds = [...[...s.el.querySelectorAll('select')].find((x) => x.labels?.[0]?.textContent === 'Condition')!.options].map((o) => [o.value, o.textContent]);
    const f = formRig();
    const formIds = [...f.by<HTMLSelectElement>('what').options].filter((o) => o.value.startsWith('lung:')).map((o) => [o.value.slice(5), o.textContent!.replace(/^Lung: /, '')]);
    expect(formIds).toEqual(sheetIds);
    expect(formIds.length).toBeGreaterThan(20);
  });

  it('a TCI, a mainstem, a recruitment and a lab sample: the form’s command equals the physiology console’s (the wire’s) and the engine takes it', () => {
    const f = formRig();
    const built: unknown[] = [];
    f.set('what', 'tci:propofol');
    f.set('Mode', 'effect');
    f.set('Target (µg/mL)', '3');
    built.push(f.add());
    f.set('what', 'tci:remifentanil');
    f.set('Mode', 'plasma');
    f.set('Target (ng/mL)', '4');
    built.push(f.add());
    for (const v of ['both', 'left', 'right']) {
      f.set('what', `mainstem:${v}`);
      built.push(f.add());
    }
    f.set('what', 'recruit:');
    f.set('Pressure (cmH₂O)', '40');
    f.set('Held for (s)', '30');
    built.push(f.add());
    for (const p of LAB_PANELS) {
      f.set('what', `lab:${p}`);
      built.push(f.add());
    }
    const wire = [tci('propofol', 3, 'effect'), tci('remifentanil', 4, 'plasma'), mainstem('both'), mainstem('left'), mainstem('right'), recruit(40, 30), ...LAB_PANELS.map((p) => lab(p))];
    expect(built).toEqual(wire);
    for (const c of built) expect(eventRefusal((c as Rec).event)).toBeUndefined();
    expect(LAB_PANELS).toEqual(['abg', 'vbg', 'chem', 'coag']);
  });

  it('the TCI offers the drugs the engine takes a TCI of, each with its concentration unit', () => {
    const f = formRig();
    const offered = [...f.by<HTMLSelectElement>('what').options].filter((o) => o.value.startsWith('tci:')).map((o) => o.value.slice(4));
    expect(offered).toEqual(DRUG_IDS.filter((id) => eventRefusal({ kind: 'tci', drugId: id, mode: 'plasma', target: 1 }) === undefined));
    expect(offered).toEqual(expect.arrayContaining(['propofol', 'remifentanil']));
    expect(offered).not.toContain('rocuronium');
  });

  it('a number the engine refuses is not written: the field says the validator’s words (the engine’s) and Add waits', () => {
    const f = formRig();
    const addOff = () => [...f.el.querySelectorAll('button')].find((x) => x.textContent === 'Add')!.disabled;
    f.set('what', 'recruit:');
    expect(f.el.textContent).toContain('Waits for every number.');
    f.set('Pressure (cmH₂O)', '100');
    f.set('Held for (s)', '30');
    const why = eventRefusal({ kind: 'recruit', pressureCmH2O: 100, durationS: 30 })!;
    expect(why).toBeTruthy();
    expect(f.el.textContent).toContain(`${why}: not written`);
    expect(addOff()).toBe(true);
    // the same words the validator prints for that command in a card
    const doc = JSON.parse(JSON.stringify(MH)) as Rec;
    (doc.script as Rec[])[0]!.commands = [recruit(100, 30)];
    expect(validateScenario(doc)).toMatchObject({ ok: false, errors: [`/script/0/commands/0/event: ${why}`] });
    f.set('Pressure (cmH₂O)', '40');
    expect(f.el.textContent).not.toContain('not written');
    expect(addOff()).toBe(false);
    f.set('what', 'tci:propofol');
    f.set('Target (µg/mL)', '500');
    expect(f.el.textContent).toContain(`${eventRefusal({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 500 })}: not written`);
    expect(addOff()).toBe(true);
    // no limit of the form's own: the number inputs carry none
    for (const i of f.el.querySelectorAll('input')) expect([i.min, i.max]).toEqual(['', '']);
  });
});

describe('the library: every card is valid and scripts none of the five (no card changes meaning)', () => {
  it.each(LIBRARY.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    expect(validateScenario(card.doc)).toMatchObject({ ok: true });
    expect(commandsOf(card.doc).filter((c) => c.type === 'applyEvent' && ENGINE_CHECKED_KINDS.includes(String((c.event as Rec).kind)))).toEqual([]);
  });
});

/** A copy of the MH card whose script sends every kind of the sheets (a test's numbers, never a card's). */
const ALL_KINDS: Rec[] = [
  { type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm' } },
  { $comment: 'a test fixture', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } },
  { type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.6, o2Device: 'mask', o2FlowLpm: 10 } },
  { type: 'applyEvent', event: { kind: 'defib', action: 'shock', energyJ: 200 } },
  { type: 'applyEvent', event: { kind: 'pacer', mode: 'demand', ratePpm: 70, mA: 70 } },
  { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } },
  { type: 'attachSensor', sensor: 'abp', state: 'connected' },
  { type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 3 } },
  // brief 174
  { type: 'applyEvent', event: { kind: 'lungCondition', id: 'bronchospasm', severity: 0.67 } },
  { type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' } },
  { type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } },
  { type: 'applyEvent', event: { kind: 'mainstem', ventilated: 'right' } },
  { type: 'applyEvent', event: { kind: 'recruit', pressureCmH2O: 40, durationS: 30 } },
  { type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } },
];
const FIXTURE: Rec = { ...MH, id: 'mh-162-fixture', script: [...(MH.script as Rec[]), { id: 'everyKind', on: 'phase:earlySigns', src: 'PLACEHOLDER: a test fixture', commands: ALL_KINDS }] };

describe('B1’s property over a card scripting every sheet kind: drawn and touched, it is written again unchanged', () => {
  it('the validator accepts the fixture, and every control touched leaves its bytes', () => {
    expect(validateScenario(FIXTURE)).toMatchObject({ ok: true });
    const form = formOf(FIXTURE);
    const sec = scriptSection(form, () => undefined, () => undefined);
    document.body.append(sec.el);
    for (const c of sec.el.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select, textarea')) {
      c.value = String(c.value);
      c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
      c.dispatchEvent(new Event('change'));
    }
    expect(JSON.stringify(docOf(form))).toBe(JSON.stringify(FIXTURE));
    // every command of the fixture offers Edit; the MH card's condition too
    expect([...sec.el.querySelectorAll('button')].filter((b) => b.textContent === 'Edit')).toHaveLength(1 + ALL_KINDS.length);
  });
});

describe('the Script section in the page (piece 162)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
  });
  const open = async (doc: Rec) => {
    const s = new Drafts(() => b.ls, () => asFactory(b.idb));
    await s.ready();
    const m = await s.create(doc as unknown as Body, 'a test card');
    if ('refused' in m) throw new Error(m.refused);
    const p = builderPage(s);
    document.body.append(p.el);
    await p.enter(m.id);
    const q = <T extends Element = HTMLElement>(sel: string) => p.el.querySelector<T>(sel)!;
    const all = <T extends Element = HTMLElement>(sel: string) => [...p.el.querySelectorAll<T>(sel)];
    const byLabel = <T extends HTMLElement = HTMLInputElement>(label: string) => q<T>(`[aria-label="${label}"]`);
    const set = (el: HTMLInputElement | HTMLSelectElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const press = (text: string) => all<HTMLButtonElement>('button').find((x) => x.textContent === text && !x.disabled)!.click();
    const body = async () => {
      await wait(0);
      await wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);
      return (await s.body(m.id)) as unknown as Rec;
    };
    all<HTMLButtonElement>('.sb-out').find((x) => x.textContent?.startsWith('Script'))!.click();
    return { q, all, byLabel, set, press, body };
  };

  it('each command edited and saved untouched: the card keeps its bytes; edited, the entry sends the new command', async () => {
    const e = await open(FIXTURE);
    for (let k = 1; k <= ALL_KINDS.length; k++) {
      e.byLabel<HTMLButtonElement>(`Entry 2: edit command ${k}`).click();
      expect(e.byLabel<HTMLSelectElement>(`Entry 2, command ${k}: what`)).toBeTruthy();
      e.press('Save the command');
    }
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(FIXTURE));
    // the ventilator's rate changed; its $comment stays in front
    e.byLabel<HTMLButtonElement>('Entry 2: edit command 2').click();
    expect(e.byLabel(`Entry 2, command 2: Rate (/min)`).value).toBe('12');
    expect(e.byLabel(`Entry 2, command 2: FiO₂ (%)`).value).toBe('50');
    e.set(e.byLabel('Entry 2, command 2: Rate (/min)'), '16');
    e.press('Save the command');
    // the defibrillator's shock edited into a charge at 150 J
    e.byLabel<HTMLButtonElement>('Entry 2: edit command 4').click();
    e.set(e.byLabel<HTMLSelectElement>('Entry 2, command 4: what'), 'defib:charge');
    e.set(e.byLabel('Entry 2, command 4: Energy (J)'), '150');
    e.press('Save the command');
    // cancelled: nothing moves
    e.byLabel<HTMLButtonElement>('Entry 2: edit command 5').click();
    e.set(e.byLabel('Entry 2, command 5: Pacing rate (/min)'), '100');
    e.press('Cancel');
    const cmds = ((await e.body()).script as Rec[])[1]!.commands as Rec[];
    expect(cmds[1]).toEqual({ $comment: 'a test fixture', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 500, peep: 5, fio2: 0.5 } });
    expect(Object.keys(cmds[1]!)[0]).toBe('$comment');
    expect(cmds[3]).toEqual({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 150 } });
    expect(cmds[4]).toEqual(ALL_KINDS[4]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('brief 174: the five kinds edited through the page; a new entry of each is accepted by the validator', async () => {
    const e = await open(FIXTURE);
    const at = ALL_KINDS.findIndex((c) => (c.event as Rec | undefined)?.kind === 'recruit') + 1;
    e.byLabel<HTMLButtonElement>(`Entry 2: edit command ${at}`).click();
    expect(e.byLabel(`Entry 2, command ${at}: Pressure (cmH₂O)`).value).toBe('40');
    e.set(e.byLabel(`Entry 2, command ${at}: Held for (s)`), '20');
    e.press('Save the command');
    const lung = ALL_KINDS.findIndex((c) => (c.event as Rec | undefined)?.id === 'ptxTension') + 1;
    e.byLabel<HTMLButtonElement>(`Entry 2: edit command ${lung}`).click();
    expect(e.byLabel<HTMLSelectElement>(`Entry 2, command ${lung}: Side`).value).toBe('R');
    e.set(e.byLabel<HTMLSelectElement>(`Entry 2, command ${lung}: Side`), 'L');
    e.press('Save the command');
    const cmds = ((await e.body()).script as Rec[])[1]!.commands as Rec[];
    expect(cmds[at - 1]).toEqual({ type: 'applyEvent', event: { kind: 'recruit', pressureCmH2O: 40, durationS: 20 } });
    expect(cmds[lung - 1]).toEqual({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'L' } });
    const items: Array<[string, Array<[string, string]>]> = [
      ['lung:asthma', [['Severity', '0.33']]], ['lung:effusion', [['Severity', '1'], ['Side', 'L']]], ['tci:propofol', [['Mode', 'plasma'], ['Target (µg/mL)', '4']]],
      ['mainstem:left', []], ['recruit:', [['Pressure (cmH₂O)', '30'], ['Held for (s)', '40']]], ['lab:vbg', []],
    ];
    for (const [what, fields] of items) {
      e.press('Add a script entry');
      e.set(e.byLabel('New entry: id'), `e${what.replace(/[^A-Za-z0-9]/g, '')}`);
      e.set(e.byLabel<HTMLSelectElement>('New command: what'), what);
      for (const [l, v] of fields) e.set(e.byLabel(`New command: ${l}`), v);
      e.press('Add the entry');
    }
    const script = (await e.body()).script as Rec[];
    expect(script.slice(-items.length).map((x) => x.commands)).toEqual([
      [{ type: 'applyEvent', event: { kind: 'lungCondition', id: 'asthma', severity: 0.33 } }],
      [{ type: 'applyEvent', event: { kind: 'lungCondition', id: 'effusion', severity: 1, side: 'L' } }],
      [{ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'plasma', target: 4 } }],
      [{ type: 'applyEvent', event: { kind: 'mainstem', ventilated: 'left' } }],
      [{ type: 'applyEvent', event: { kind: 'recruit', pressureCmH2O: 30, durationS: 40 } }],
      [{ type: 'applyEvent', event: { kind: 'lab', panel: 'vbg' } }],
    ]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a command the sheet’s form cannot build has no Edit and says it is kept as the card has it', async () => {
    const doc = JSON.parse(JSON.stringify(FIXTURE)) as Rec;
    (doc.script as Rec[])[1]!.commands = [{ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } }];
    const e = await open(doc);
    expect(e.byLabel('Entry 2: edit command 1')).toBeNull();
    expect(e.q('[data-section="script"] .sb-endrow:nth-child(2)').textContent).toContain('Airway bronchospasmkept as the card has it');
  });

  it('a new entry of each sheet kind, at Early signs: the validator accepts the card', async () => {
    const e = await open({ ...MH, id: 'mh-mine' });
    const items: Array<[string, Array<[string, string]>]> = [
      ['airway:obstructed', []], ['vent:bvm', [['Rate (/min)', '10'], ['FiO₂ (%)', '100']]], ['o2:nasal', [['Flow', '4']]], ['defib:syncOn', []], ['pacer:off', []],
      ['cpr:stop', []], ['sensor:co2', [['Sensor', 'on']]], ['nibp:start', []],
    ];
    for (const [what, fields] of items) {
      e.press('Add a script entry');
      e.set(e.byLabel('New entry: id'), `e${what.replace(/[^A-Za-z0-9]/g, '')}`);
      e.set(e.byLabel<HTMLSelectElement>('New entry: fires at: when'), 'phase');
      e.set(e.byLabel<HTMLSelectElement>('New entry: fires at: which phase'), 'earlySigns');
      e.set(e.byLabel<HTMLSelectElement>('New command: what'), what);
      for (const [l, v] of fields) e.set(e.byLabel(`New command: ${l}`), v);
      e.press('Add the entry');
    }
    const script = (await e.body()).script as Rec[];
    expect(script.slice(1).map((s) => s.commands)).toEqual([
      [{ type: 'applyEvent', event: { kind: 'airway', state: 'obstructed' } }],
      [{ type: 'applyEvent', event: { kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 500, peep: 5, fio2: 1 } }],
      [{ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous', fio2: 0.36, o2Device: 'nasal', o2FlowLpm: 4 } }],
      [{ type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } }],
      [{ type: 'applyEvent', event: { kind: 'pacer', mode: 'off', ratePpm: 70, mA: 70 } }],
      [{ type: 'applyEvent', event: { kind: 'cpr', active: false } }],
      [{ type: 'attachSensor', sensor: 'co2', state: 'on' }],
      [{ type: 'device', action: { device: 'nibp', action: 'start' } }],
    ]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });
});
