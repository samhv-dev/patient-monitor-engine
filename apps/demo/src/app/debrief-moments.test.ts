// The key moments and key times on the recorded tamponade run of kit round A3.1 (its scenario overlaid with the
// objectives as the card holds them now), on the MH card with and without the recognition tick, and on a synthetic run.
import type { ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import a31 from '../../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json';
import { debriefJson } from './debrief-export.ts';
import { keyMoments, keyTimes, pulselessAt, whoOf } from './debrief-moments.ts';
import { drugWords } from './glossary.ts';
import { emptyRun, type Row, type RunData, type Sample } from './record.ts';
import { objectiveText } from './scenarios.ts';
import mh from './showcase/showcase-mh.json';
import tamponade from './showcase/showcase-tamponade.json';

const card = tamponade as unknown as ScenarioDoc;
/** The A3.1 record (a `/1` export) with the card's objectives as A1 left them. */
function a31Run(extra: Row[] = []): RunData {
  const d = structuredClone(a31.record) as unknown as RunData;
  const doc = d.doc as ScenarioDoc;
  doc.objectives = structuredClone(card.objectives);
  d.rows.push(...extra);
  return d;
}
const tickOf = (doc: ScenarioDoc, t: number): Row => ({ t, kind: 'note', text: `Objective met: ${drugWords(objectiveText((doc.objectives ?? [])[0] as string))}` });

describe('key moments on the A3.1 tamponade path', () => {
  it('the recorded scenario has the card’s objective texts', () => {
    const recorded = ((a31.record.doc as unknown as ScenarioDoc).objectives ?? []).map(objectiveText);
    expect(recorded).toEqual((card.objectives ?? []).map(objectiveText));
  });

  it('seven moments: who, text, values at that second (SpO₂ – while pulseless), alarms since the last row', () => {
    const ms = keyMoments(a31Run());
    const want: Array<[string, string, string, number, number, number | null, number]> = [
      ['06:13', 'patient', 'Deteriorating: systolic below 80', 136, 70.56, 99, 24],
      ['07:48', 'patient', 'Pulse lost (the model) · PEA', 46, 20.83, null, 14],
      ['07:51', 'team', 'CPR, ventilated with FiO₂ 1.0', 44, 20.12, null, 13],
      ['09:21', 'team', 'CPR: pericardium drained, catheter left in', 107, 27.84, null, 9],
      ['10:55', 'patient', 'Circulation returned (the model)', 135, 45.25, null, 19],
      ['10:57', 'team', 'Return of circulation: ventilated, catheter in the pericardium', 119, 62.59, 99, 19],
      ['11:27', 'team', 'Post-ROSC: 500 mL crystalloid running', 64, 90.49, 99, 28],
    ];
    expect(ms).toHaveLength(7);
    ms.forEach((m, i) => {
      const [time, who, text, hr, map, spo2, etco2] = want[i] as (typeof want)[number];
      expect(m.n).toBe(i + 1);
      expect(`${String(Math.floor(m.t / 60)).padStart(2, '0')}:${String(Math.floor(m.t % 60)).padStart(2, '0')}`).toBe(time);
      expect([m.who, m.text]).toEqual([who, text]);
      expect(m.values.hr).toBe(hr);
      expect(m.values.map).toBeCloseTo(map, 2);
      expect(m.values.spo2).toBe(spo2);
      expect(m.values.etco2).toBe(etco2);
      expect(m.pulseless).toBe(spo2 === null);
    });
    expect(ms.map((m) => m.alarms)).toEqual([
      ['CVP high', 'SpO₂: low perfusion', 'ART S low'],
      ['ART M low', 'HR high', 'ART D low', 'EtCO₂ low', 'ART: no pulsatile pressure', 'HR low'],
      [],
      ['ART S low', 'ART D low'],
      [],
      [],
      ['ART D high', 'ART M high'],
    ]);
  });

  it('pulselessAt: from the pulse loss to the return of circulation, both ends included (E60)', () => {
    const d = a31Run();
    for (const t of [468, 471.15, 561.37, 655]) expect(pulselessAt(d, t)).toBe(true);
    for (const t of [373.62, 657.26, 687.43]) expect(pulselessAt(d, t)).toBe(false);
  });

  it('whoOf: a vital-sign transition is the patient, a manual one the team, none the scenario', () => {
    const d = a31Run();
    expect(whoOf(d, 'arrival', 'deteriorating')).toBe('patient');
    expect(whoOf(d, 'pea', 'cpr')).toBe('team');
    expect(whoOf(d, 'arrival', 'roscFluid')).toBe('scenario');
  });
});

describe('key times', () => {
  it('A3.1: recognition not ticked, the first team action, three objective intervals, pulseless in all', () => {
    const ks = keyTimes(a31Run());
    expect(ks.map((k) => k.id)).toEqual(['recognition', 'firstTeam', 'objective:1', 'objective:2', 'objective:3', 'pulseless']);
    const by = Object.fromEntries(ks.map((k) => [k.id, k]));
    expect(by.recognition).toMatchObject({ fromT: 0, toT: null, state: 'notTicked' });
    expect(by.firstTeam?.fromT).toBe(0);
    expect(by.firstTeam?.toT).toBeCloseTo(471.15, 2);
    expect(by['objective:1']).toMatchObject({ fromT: 468, askedS: 10, state: 'measured' });
    expect(by['objective:1']?.toT).toBeCloseTo(471.2, 2);
    expect(by['objective:2']?.fromT).toBeCloseTo(471.2, 2);
    expect(by['objective:2']?.toT).toBeCloseTo(561.37, 2);
    expect(by['objective:2']?.askedS).toBe(120);
    expect(by['objective:3']).toMatchObject({ fromT: 655, askedS: 30 });
    expect(by['objective:3']?.toT).toBeCloseTo(657.26, 2);
    expect(by.pulseless).toMatchObject({ fromT: 468, toT: null, totalS: 187, state: 'measured' });
    expect(by['objective:1']?.label).toBe('Start CPR within 10 s of the pulse loss');
  });

  it('pme-debrief/2 carries them (B2): the A3.1 export round-trips its key times and moments', () => {
    const d = a31Run();
    const j = JSON.parse(debriefJson(d, 'b'));
    expect(j.keyTimes).toEqual(keyTimes(d));
    expect(j.keyMoments).toEqual(keyMoments(d));
    expect(j.keyMoments).toHaveLength(7);
    expect(j.keyTimes).toHaveLength(6);
  });

  it('A3.1 with the tick: the recognition tile is the tick time as recorded', () => {
    const T = 130;
    const ks = keyTimes(a31Run([tickOf(card, T)]));
    expect(ks.find((k) => k.id === 'recognition')).toMatchObject({ fromT: 0, toT: T, state: 'measured' });
  });

  it('MH (E52): the new recognition objective gives a tile with the tick, and "not ticked" without it', () => {
    const doc = mh as unknown as ScenarioDoc;
    const T = 412;
    const base = (): RunData => ({ ...emptyRun('MH', 70, 0), doc, samples: Array.from({ length: 500 }, (_, t) => sampleAt(t)) });
    const ticked = base();
    ticked.rows.push(tickOf(doc, T));
    expect(keyTimes(ticked).find((k) => k.id === 'recognition')).toMatchObject({ fromT: 0, toT: T, state: 'measured' });
    expect(keyTimes(base()).find((k) => k.id === 'recognition')).toMatchObject({ toT: null, state: 'notTicked' });
  });

  it('the six-tile cap counts only tiles the view draws: a pulse loss with no CPR does not push "Pulseless in all" out (R-B N1)', () => {
    const doc: ScenarioDoc = {
      ...structuredClone(card),
      objectives: [
        { text: 'Name it', debrief: 'recognition' },
        { text: 'Shock within 60 s of the fluid', rule: { kind: 'eventWithin', after: 'fluid', event: 'shock', withinS: 60 } },
        { text: 'Adrenaline within 60 s of the shock', rule: { kind: 'eventWithin', after: 'shock', event: 'drug:adrenaline', withinS: 60 } },
        { text: 'Pulse loss within 60 s of the adrenaline', rule: { kind: 'eventWithin', after: 'drug:adrenaline', event: 'pulseLoss', withinS: 60 } },
      ],
    };
    const d: RunData = {
      ...emptyRun('N1', 70, 0), doc,
      samples: Array.from({ length: 200 }, (_, t) => sampleAt(t)),
      rows: [
        { t: 10, kind: 'action', text: 'Fluid 500 mL', ev: 'fluid' },
        { t: 20, kind: 'action', text: 'Shock 150 J', ev: 'shock' },
        { t: 30, kind: 'action', text: 'Adrenaline 1 mg', ev: 'drug:adrenaline' },
        { t: 40, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' },
      ],
    };
    const ks = keyTimes(d);
    expect(ks.map((k) => k.id)).toEqual(['recognition', 'firstTeam', 'objective:1', 'objective:2', 'objective:3', 'pulseLostToCpr', 'pulseless']);
    expect(ks.filter((k) => k.state !== 'noneAfter')).toHaveLength(6);
    expect(ks.find((k) => k.id === 'pulseLostToCpr')?.state).toBe('noneAfter');
  });

  it('a run with no scenario: the pulse loss and its return are the moments; no CPR after it', () => {
    const d: RunData = {
      ...emptyRun('free', 70, 0),
      samples: Array.from({ length: 200 }, (_, t) => sampleAt(t)),
      rows: [
        { t: 60, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' },
        { t: 120, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      ],
    };
    const ms = keyMoments(d);
    expect(ms.map((m) => [m.t, m.who, m.pulseless, m.values.spo2])).toEqual([[60, 'patient', true, null], [120, 'patient', true, null]]);
    expect(keyTimes(d)).toEqual([
      { id: 'pulseLostToCpr', label: 'Pulse lost → CPR', fromT: 60, toT: null, state: 'noneAfter' },
      { id: 'pulseless', label: 'Pulseless in all', fromT: 60, toT: null, totalS: 60, state: 'measured' },
    ]);
  });
});

function sampleAt(t: number): Sample {
  return { t, hr: 80, map: 80, spo2: 98, etco2: 35, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null };
}
