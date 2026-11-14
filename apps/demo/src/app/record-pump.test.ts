// Plan pump-rack-tci.md C2 (§7 "Record", §8): a row per applied pump action — the tablet's (kind `pump`, its device key
// and the name Room setup gave it), or a remote's or the laptop's change routed to a channel (D9: that sender's kind) —
// with the channel, the value it replaced and who had set it, and for a load the syringe's or bag's origin; the drug is
// the channel's TRUE contents. The host's mismatch finding is a `pump` row, and so is the notice being shown.
import { PUMP_ISSUED_BY, type WireEvent } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { RunRecord } from './record.ts';

const KEY = 'pumptab0001';
const PROPOFOL = { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } };
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, ...command } } }) as WireEvent;
const press = (tick: number, event: Record<string, unknown>, pump: Record<string, unknown>, issuedBy = PUMP_ISSUED_BY, by: string | undefined = KEY) =>
  applied(tick, { issuedBy, ...(by ? { by } : {}), type: 'applyEvent', event: { kind: 'pump', ch: 2, ...event }, pump: { ch: 2, ...pump } });
const names = (m: Record<string, string>) => (k: string) => m[k] ?? null;

describe('C2: the pump rows of the record', () => {
  it('the tablet\'s load, programme, rate change and bolus: `pump` rows with its key and name, the channel, the replaced rate, the origin, the true dose', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names({ [KEY]: 'bed 2 pumps' }));
    r.wire(press(500, { action: 'load', channel: 'syringe', contents: { ...PROPOFOL, volumeMl: 50 }, syringeMl: 50 }, { origin: { stock: 'propofol-10mg-ml-50ml' }, contents: PROPOFOL }));
    r.wire(press(600, { action: 'program', ...PROPOFOL }, { contents: PROPOFOL }));
    r.wire(press(700, { action: 'rate', rate: 30, unit: 'mL/h' }, { contents: PROPOFOL, infusion: { rate: 30, unit: 'mL/h' }, replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: KEY }] }));
    r.wire(press(800, { action: 'bolus', volumeMl: 2, rateMlH: 800 }, { contents: PROPOFOL, gives: 'propofol', bolus: { volumeMl: 2, dose: 20, unit: 'mg', seconds: 9 } }));
    const rows = r.data.rows;
    expect(rows.map((x) => [x.t, x.kind, x.text, x.channel, x.by, x.name, x.ev ?? ''])).toEqual([
      [10, 'pump', 'Channel 2: 50 mL syringe of Propofol 10 mg/mL loaded (50 mL)', 2, KEY, 'bed 2 pumps', ''],
      [12, 'pump', 'Channel 2 programmed: Propofol 10 mg/mL', 2, KEY, 'bed 2 pumps', ''],
      [14, 'pump', 'Channel 2: rate 30 mL/h', 2, KEY, 'bed 2 pumps', 'drug:propofol'],
      [16, 'pump', 'Channel 2: bolus 2 mL', 2, KEY, 'bed 2 pumps', 'drug:propofol'],
    ]);
    expect(rows[0]?.pump).toEqual({ origin: { stock: 'propofol-10mg-ml-50ml' } });
    expect(rows[2]?.pump).toEqual({ replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: KEY }] });
    expect(rows[3]?.dose).toEqual({ drugId: 'propofol', dose: 20, unit: 'mg' });
  });

  it('a remote\'s change routed to the channel (D9) is the remote\'s `learner` row on that channel; the laptop\'s is an `action` row', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
    r.wire(press(700, { action: 'rate', rate: 25, unit: 'mL/h' }, { contents: PROPOFOL, infusion: { rate: 25, unit: 'mL/h' } }, 'learner', 'bed2remote01'));
    r.wire(press(750, { action: 'stop' }, { contents: PROPOFOL, infusion: { rate: 0, unit: 'mL/h' } }, 'instructor', undefined));
    expect(r.data.rows.map((x) => [x.kind, x.by ?? '', x.remote ?? false, x.channel, x.text])).toEqual([
      ['learner', 'bed2remote01', true, 2, 'Channel 2: rate 25 mL/h'],
      ['action', '', false, 2, 'Channel 2 stopped'],
    ]);
  });

  it('the host\'s mismatch finding, its notice and its clearing are `pump` rows (the instructor\'s screens hear them; the record keeps them)', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
    const finding = (t: number, notice: { shownAt: number } | null) =>
      ({ type: 'prep', t, to: 'host-1', body: { news: 'pumpMismatch', ch: 1, kind: 'syringe', device: KEY, since: 300, notice, text: 'remifentanil 50 mcg/mL programmed as propofol 10 mg/mL' } }) as WireEvent;
    r.wire(finding(300, null));
    r.wire(finding(310, { shownAt: 312 }));
    r.wire({ type: 'prep', t: 320, to: 'host-1', body: { news: 'pumpMismatchCleared', ch: 1 } } as WireEvent);
    r.wire({ type: 'prep', t: 321, to: 'pump.1', body: { news: 'channel', row: {} } } as WireEvent); // a pump's own news: not a row
    expect(r.data.rows.map((x) => [x.t, x.kind, x.channel, x.text])).toEqual([
      [300, 'pump', 1, 'Channel 1: Syringe and programme differ (remifentanil 50 mcg/mL programmed as propofol 10 mg/mL)'],
      [312, 'pump', 1, 'Channel 1: mismatch notice shown on the pump'],
      [320, 'pump', 1, 'Channel 1: contents and programme agree'],
    ]);
  });
});
