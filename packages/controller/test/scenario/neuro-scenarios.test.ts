// Stage 7f scenarios: valid against the schema (event kinds stimulus/airwayDevice/neuroProfile, 7g's vaporiser, devices
// tof/depth) and every command they send is accepted by the engine (drug and vaporiser events by 7g, R51 §3–4).
import { readFileSync } from 'node:fs';
import { createEngine, type Command } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import type { DocCommand, ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const IDS = ['nmb-residual-block', 'nmb-sux-burn', 'depth-light-anaesthesia', 'depth-awareness', 'depth-opioid-apnoea', 'nmb-mh-trigger'];
const load = (id: string) => JSON.parse(readFileSync(new URL(`../../scenarios/${id}.json`, import.meta.url), 'utf8')) as ScenarioDoc;

describe('Stage 7f scenarios', () => {
  it.each(IDS)('%s is a valid [draft] scenario whose commands the engine accepts', (id) => {
    const d = load(id);
    const r = validateScenario(d, {});
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(d.title.startsWith('[draft]')).toBe(true);
    const e = createEngine({ seed: 1, patient: d.patient as never });
    const cmds: DocCommand[] = d.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);
    for (const [i, c] of cmds.entries()) {
      const res = e.dispatch({ id: `${id}-${i}`, issuedBy: 'test', ...(c as object) } as Command);
      expect(res.accepted, `${JSON.stringify(c)}: ${res.reason}`).toBe(true);
    }
  });
});
