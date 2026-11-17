// A technical alarm's level is the monitor style's data (skin `alarms.technical`), never a number in the engine.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSkin, SKIN_IDS, TECHNICAL_ALARMS, type TechnicalAlarmId } from '@pme/skins';
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, SPO2_SEARCH_S, type AlarmInputs } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile, type DeviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { Measured } from '../../../src/types.ts';

const T = SPO2_SEARCH_S + 5;
const measure = (inp: AlarmInputs, values: Record<string, Partial<Measured>>) =>
  observeEvent(inp, { type: 'measurement', t: T, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: null, flag: 'valid', at: T, ...v }])) });

/** Inputs that together raise every technical condition once (some exclude each other, so several sets). */
function scenarios(): AlarmInputs[] {
  const all = createInputs();
  Object.assign(all, { leadsOff: true, spo2Probe: 'off', co2: 'occluded', nibpFailed: true, temp: 'off', tempSeen: true, abp: 'zeroing' });
  const noSensor = createInputs();
  const staticAbp = Object.assign(createInputs(), { abp: 'connected' });
  measure(staticAbp, { abpMean: { value: 60 }, abpSys: { flag: 'invalid' } });
  const [nonPuls, lowPerf, lowSignal] = [createInputs(), createInputs(), createInputs()];
  measure(nonPuls, { spo2: { flag: 'invalid' } });
  measure(lowPerf, { spo2: { value: 97 }, pi: { value: 0.1 } });
  measure(lowSignal, { spo2: { value: 97, flag: 'questionable' }, pi: { value: 2 } });
  return [all, noSensor, staticAbp, nonPuls, lowPerf, lowSignal];
}

function technicalLevels(p: DeviceProfile): Map<string, number> {
  const out = new Map<string, number>();
  for (const inp of scenarios()) for (const c of buildConditions(createAlarmMgr(p), inp, T)) if (c.category === 'technical') out.set(c.id, c.level);
  return out;
}

describe('technical alarm levels come from the style', () => {
  for (const id of SKIN_IDS) {
    it(`${id}: every technical alarm takes the level its data state`, () => {
      const data = resolveSkin(id).skin.alarms.technical;
      const p = { ...deviceProfile(id), ibpNoSensor: true };
      expect(Object.fromEntries(technicalLevels(p))).toEqual(Object.fromEntries(TECHNICAL_ALARMS.map((a) => [a, data[a].level])));
    });
  }

  it('saadat-like: leads-off, sensor-off and the clogged sampling line are level 2, the rest level 3 (B9 manuals, research/83)', () => {
    const levels = technicalLevels(deviceProfile('saadat-like'));
    const two: TechnicalAlarmId[] = ['ecgLeadsOff', 'spo2SensorOff', 'co2Line'];
    for (const a of TECHNICAL_ALARMS) expect([a, levels.get(a)]).toEqual([a, two.includes(a) ? 2 : 3]);
    const texts = Object.fromEntries(buildConditions(createAlarmMgr(deviceProfile('saadat-like')), scenarios()[0] as AlarmInputs, T).map((c) => [c.id, c.text]));
    expect(texts).toMatchObject({ spo2SensorOff: 'SPO2 SENSOR OFF', co2Line: 'SAMPLING LINE CLOGGED' });
  });

  it('a level in the data is the level raised, whatever it is', () => {
    for (const level of [1, 2, 3] as const) {
      const p = { ...deviceProfile('philips-like'), ibpNoSensor: true, technicalLevels: Object.fromEntries(TECHNICAL_ALARMS.map((a) => [a, level])) as DeviceProfile['technicalLevels'] };
      const levels = technicalLevels(p);
      expect([...levels.keys()].sort()).toEqual([...TECHNICAL_ALARMS].sort());
      expect(new Set(levels.values())).toEqual(new Set([level]));
    }
  });

  it('no engine source raises a technical alarm with a level of its own', () => {
    const src = join(import.meta.dirname, '../../../src');
    const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));
    const hits = files.filter((f) => /\b[123],\s*'technical'|level:\s*[123],\s*category:\s*'technical'/.test(readFileSync(join(src, f), 'utf8')));
    expect(hits).toEqual([]);
  });
});
