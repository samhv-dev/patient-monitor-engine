// @vitest-environment happy-dom
// Plan pump-rack-tci.md A1 ("Tests first"; §5 the generic face, §8 the programme never the contents, D8 the alarms, D12
// the device profiles): one face per channel, drawn from the follower engine's `pumps` rows (E1, PumpPanelRow) through
// the projection that drops the contents (face-row.ts), for a syringe and a drip channel from scripted engine states; a
// profile's gap shown as the face's words, never filled; no maker or model on the generic face; English only, left to
// right. The rack: n channels and their kinds from Room setup's setting, a loaded channel the engine holds kept on view.
import type { PumpPanelRow } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { faceRow, type FaceRow } from './face-row.ts';
import { FACE_LABELS, faceModel, faceView, type FaceProfiles } from './face.ts';
import { rackView } from './rack.ts';

/** A propofol 10 mg/mL syringe channel at 20 mL/h, 12 mL in, 38 mL left: E1's row as the `drugs` event carries it. */
const syringe = (o: Partial<PumpPanelRow> = {}): PumpPanelRow => ({
  ch: 1, kind: 'syringe', state: 'running',
  programmed: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
  contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
  syringeMl: 50, set: null, mode: 'rate',
  rate: { rate: 20, unit: 'mL/h' }, rateMlH: 20, limitMl: null,
  volumeMl: 38, infusedMl: 12, wasteMl: 0, timeToEmptyMin: 114, alarms: [],
  ...o,
});
/** A drip channel: norepinephrine 4 mg in 250 mL on a 20 drops/mL set at 30 drops/min (90 mL/h), a 100 mL limit. */
const drip = (o: Partial<PumpPanelRow> = {}): PumpPanelRow => ({
  ch: 2, kind: 'drip', state: 'running',
  programmed: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 } },
  contents: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 } },
  syringeMl: null, set: 20, mode: 'rate',
  rate: { rate: 30, unit: 'drops/min' }, rateMlH: 90, limitMl: 100,
  volumeMl: 220, infusedMl: 30, wasteMl: 0, timeToEmptyMin: 146.67, alarms: [],
  ...o,
});

/** S1's shape (origin/pump-s1-stock-syringes-device-profiles, packages/controller/pump-devices/*.json), the two keys the face reads: gaps as S1 writes them. */
const PROFILES: FaceProfiles = {
  syringe: { nearEnd: { gap: 'the near-end time at which Almost Empty is raised: SP-500 operator manual (research/50 SP-21)' } },
  drip: { kvo: { rate: 1, unit: 'mL/h', src: 'OT-15', after: { gap: 'whether and when the pump enters KVO after Infusion Complete: OT-701 operator manual (research/50 OT-24)' } } },
};

const field = (el: HTMLElement, key: string) => el.querySelector(`[data-field="${key}"] dd`)?.textContent ?? null;
const keys = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-field]')].map((e) => e.dataset.field);

describe('the projection: the programme, never the contents (§8)', () => {
  it('drops the contents and every key not on its list', () => {
    const r = faceRow(syringe({ contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 } } }));
    expect('contents' in r).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/remifentanil|mcg/);
    expect(r.programmed?.drugId).toBe('propofol');
  });
  it('is the only way to a FaceRow: an engine row is not one', () => {
    // @ts-expect-error a PumpPanelRow is not a FaceRow (the brand only faceRow() gives), so the face cannot be handed the contents
    const r: FaceRow = syringe();
    expect(r).toBeTruthy();
  });
});

describe('the face, per channel kind (§5)', () => {
  it('a syringe channel: programme, state, syringe, rate with its dose rate, volumes, time to empty, alarms', () => {
    const f = faceView(1, 'syringe', PROFILES);
    f.update(faceRow(syringe()));
    expect(f.el.querySelector('.pf-title')?.textContent).toBe('Channel 1 · Syringe');
    expect(f.el.querySelector('[data-face="programmed"]')?.textContent).toBe('Propofol 10 mg/mL');
    expect(f.el.querySelector('[data-face="state"]')?.textContent).toBe('Running');
    expect(keys(f.el)).toEqual(['syringe', 'rate', 'dose', 'infused', 'remaining', 'toEmpty', 'alarms', 'almostEmpty']);
    expect(field(f.el, 'syringe')).toBe('50 mL');
    expect(field(f.el, 'rate')).toBe('20 mL/h');
    expect(field(f.el, 'dose')).toBe('200 mg/h'); // 20 mL/h × 10 mg/mL, the PROGRAMMED concentration, as a pump computes it
    expect(field(f.el, 'infused')).toBe('12 mL · 120 mg');
    expect(field(f.el, 'remaining')).toBe('38 mL');
    expect(field(f.el, 'toEmpty')).toBe('1 h 54 min');
    expect(field(f.el, 'alarms')).toBe('None');
    expect(f.el.dataset).toMatchObject({ kind: 'syringe', mode: 'rate', state: 'running', skin: 'generic' });
  });

  it('a syringe channel run by a dose rate shows that rate and its mL/h', () => {
    const f = faceView(1, 'syringe', PROFILES);
    f.update(faceRow(syringe({ rate: { rate: 100, unit: 'mcg/kg/min', weightKg: 70 }, rateMlH: 42 })));
    expect(field(f.el, 'rate')).toBe('42 mL/h');
    expect(field(f.el, 'dose')).toBe('100 µg/kg/min');
  });

  it('a drip channel: programme, set, rate in the unit entered with the other beside it, volume limit, volumes, alarms', () => {
    const f = faceView(2, 'drip', PROFILES);
    f.update(faceRow(drip()));
    expect(f.el.querySelector('.pf-title')?.textContent).toBe('Channel 2 · Drip');
    expect(f.el.querySelector('[data-face="programmed"]')?.textContent).toBe('Norepinephrine 4 mg in 250 mL');
    expect(keys(f.el)).toEqual(['set', 'rate', 'rateOther', 'limit', 'infused', 'remaining', 'toEmpty', 'alarms', 'kvo']);
    expect(field(f.el, 'set')).toBe('20 drops/mL');
    expect(field(f.el, 'rate')).toBe('30 drops/min');
    expect(field(f.el, 'rateOther')).toBe('90 mL/h');
    expect(field(f.el, 'limit')).toBe('100 mL');
    expect(field(f.el, 'infused')).toBe('30 mL · 0.48 mg'); // 30 mL × 4 mg / 250 mL
    expect(field(f.el, 'remaining')).toBe('220 mL');
    expect(field(f.el, 'toEmpty')).toBe('2 h 27 min');
    expect(f.el.querySelector('[data-field="dose"]')).toBeNull(); // the face has no dose line on a drip channel
  });

  it('a drip channel entered in mL/h shows drops/min beside it; no limit says None', () => {
    const f = faceView(2, 'drip', PROFILES);
    f.update(faceRow(drip({ rate: { rate: 60, unit: 'mL/h' }, rateMlH: 60, limitMl: null })));
    expect(field(f.el, 'rate')).toBe('60 mL/h');
    expect(field(f.el, 'rateOther')).toBe('20 drops/min'); // 60 mL/h × 20 drops/mL ÷ 60
    expect(field(f.el, 'limit')).toBe('None');
  });

  it('an empty channel says Not loaded and shows dashes, not zeros', () => {
    const f = faceView(3, 'syringe', PROFILES);
    f.update(null);
    expect(f.el.querySelector('[data-face="state"]')?.textContent).toBe('Not loaded');
    expect(f.el.querySelector('[data-face="programmed"]')?.textContent).toBe('Not programmed');
    expect(field(f.el, 'rate')).toBe('—');
    expect(field(f.el, 'toEmpty')).toBe('—');
  });

  it("the engine's alarms in the catalogues' words (D8)", () => {
    const f = faceView(1, 'syringe', PROFILES);
    f.update(faceRow(syringe({ state: 'alarm', alarms: ['end'], volumeMl: 0, timeToEmptyMin: null })));
    expect(f.el.querySelector('[data-face="state"]')?.textContent).toBe('Alarm');
    expect(field(f.el, 'alarms')).toBe('End');
    const d = faceView(2, 'drip', PROFILES);
    d.update(faceRow(drip({ state: 'alarm', alarms: ['infusionComplete'] })));
    expect(field(d.el, 'alarms')).toBe('Infusion Complete');
  });
});

describe("a device profile's gap is shown as the face's words, never filled (D8, D12)", () => {
  it('Almost Empty on a syringe channel: "near-end time not set"; KVO on a drip channel: "KVO not set from the manual"', () => {
    const s = faceView(1, 'syringe', PROFILES);
    s.update(faceRow(syringe()));
    expect(field(s.el, 'almostEmpty')).toBe('near-end time not set');
    const d = faceView(2, 'drip', PROFILES);
    d.update(faceRow(drip()));
    expect(field(d.el, 'kvo')).toBe('KVO not set from the manual');
  });
  it('with no profile loaded the line says so, and nothing is made up', () => {
    const s = faceView(1, 'syringe', null);
    s.update(faceRow(syringe()));
    expect(field(s.el, 'almostEmpty')).toBe('device profile not loaded');
  });
  it('a sourced value in place of the gap is not invented into an alarm: the line goes', () => {
    const m = faceModel(faceRow(syringe()), 'syringe', { ...PROFILES, syringe: { nearEnd: { min: 3, src: 'SP-21' } } }, FACE_LABELS);
    expect(m.fields.map((x) => x.key)).not.toContain('almostEmpty');
  });
  it("names no maker or model and carries none of the gap's own text", () => {
    const s = faceView(1, 'syringe', PROFILES);
    s.update(faceRow(syringe()));
    const d = faceView(2, 'drip', PROFILES);
    d.update(faceRow(drip()));
    for (const el of [s.el, d.el]) expect(el.outerHTML).not.toMatch(/JMS|SP-500|OT-701|SP5|Mindray|Braun|operator manual|research\/50/i);
  });
});

describe('English only on the face', () => {
  it('the face is lang="en", left to right, and every word in it is Latin script', () => {
    const f = faceView(1, 'syringe', PROFILES);
    f.update(faceRow(syringe()));
    expect(f.el.getAttribute('lang')).toBe('en');
    expect(f.el.getAttribute('dir')).toBe('ltr');
    expect(f.el.textContent).not.toMatch(/[؀-ۿ]/);
  });
});

describe('the seam A2 attaches to: a redraw keeps what is mounted in the actions slot', () => {
  it('update after update leaves the slot and its children in place', () => {
    const f = faceView(1, 'syringe', PROFILES);
    const b = document.createElement('button');
    f.actions.append(b);
    f.update(faceRow(syringe()));
    f.update(faceRow(syringe({ rateMlH: 30, rate: { rate: 30, unit: 'mL/h' } })));
    expect(f.actions.contains(b)).toBe(true);
    expect(f.el.contains(f.actions)).toBe(true);
  });
});

describe("the rack: n channels and their kinds from Room setup's setting (PQ1 = C)", () => {
  it('waits for the setting, then builds one face per channel with its kind', () => {
    const r = rackView({ profiles: PROFILES });
    expect(r.el.querySelectorAll('.pump-face')).toHaveLength(0);
    expect(r.el.textContent).toContain("Waiting for the room's pump setting");
    r.setKinds(['syringe', 'syringe', 'drip', 'syringe', 'drip']);
    const faces = [...r.el.querySelectorAll<HTMLElement>('.pump-face')];
    expect(faces.map((f) => f.dataset.kind)).toEqual(['syringe', 'syringe', 'drip', 'syringe', 'drip']);
    expect(faces.map((f) => f.dataset.ch)).toEqual(['1', '2', '3', '4', '5']);
    expect(r.el.dataset.rows).toBe('2'); // 5–8 channels in two rows (§5)
    r.setKinds(['syringe']);
    expect(r.el.querySelectorAll('.pump-face')).toHaveLength(1);
    expect(r.el.dataset.rows).toBe('1');
  });

  it("matches the engine's rows by channel; a channel the engine has not made is Not loaded", () => {
    const r = rackView({ profiles: PROFILES });
    r.setKinds(['syringe', 'drip', 'syringe', 'syringe']);
    r.update([faceRow(drip())]);
    const st = [...r.el.querySelectorAll<HTMLElement>('.pump-face')].map((f) => f.dataset.state);
    expect(st).toEqual(['notLoaded', 'running', 'notLoaded', 'notLoaded']);
    expect(r.channel(2)?.row()?.kind).toBe('drip');
  });

  it("a loaded channel keeps the engine's kind, and one beyond the count stays on view", () => {
    const r = rackView({ profiles: PROFILES });
    r.setKinds(['drip', 'syringe']); // Room setup says channel 1 is a drip channel, but it holds a loaded syringe
    r.update([faceRow(syringe({ ch: 1 })), faceRow(syringe({ ch: 4 }))]);
    const faces = [...r.el.querySelectorAll<HTMLElement>('.pump-face')];
    expect(faces.map((f) => [f.dataset.ch, f.dataset.kind])).toEqual([['1', 'syringe'], ['2', 'syringe'], ['4', 'syringe']]);
  });

  it('tells A2 of each new row on a channel, and keeps its mounted actions through a re-layout', () => {
    const r = rackView({ profiles: PROFILES });
    r.setKinds(['syringe', 'syringe']);
    const seen: Array<number | null> = [];
    const c = r.channel(1);
    c?.onRow((row) => seen.push(row?.rateMlH ?? null));
    const b = document.createElement('button');
    c?.actions.append(b);
    r.update([faceRow(syringe())]);
    r.setKinds(['syringe', 'syringe', 'drip']);
    expect(seen).toEqual([20]);
    expect(r.channel(1)?.actions.contains(b)).toBe(true);
  });
});
