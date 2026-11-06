// @vitest-environment happy-dom
// Debrief 2, D5 (plan Decision 3; the owner's ruling of 5 November, DQ4): the "Recognised" press is the /1 fallback. On a
// /1 card with a recognition objective it sends exactly the Scenario tab's tick; on any other /1 card or a free run one
// note row with `ev: 'recognised'`; on a pme-scenario/2 card it is not shown (recognition there is the card's timed action).
import { ControllerSession, createInProcessHub, ScenarioView, type AnyScenarioDoc, type ScenarioDoc } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { drugWords } from './glossary.ts';
import { Link } from './link.ts';
import { recognisedButton, recognisedNote } from './recognised.ts';
import { RunRecord } from './record.ts';
import { objectiveText } from './scenarios.ts';
import type { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import haemorrhage from './showcase/showcase-haemorrhage.json';
import mhV2 from './showcase/showcase-mh-v2.json';
import tamponade from './showcase/showcase-tamponade.json';
import { mountDock } from './teach2/dock.ts';

const tick = (o: ScenarioDoc) => `Objective met: ${drugWords(objectiveText((o.objectives ?? []).find((x) => typeof x !== 'string' && x.debrief === 'recognition') as never))}`;
const settle = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** A host Link (the in-process hub) whose record is a real RunRecord, on `doc` (null: a free run). */
function host(doc: AnyScenarioDoc | null, simT = 30) {
  const hub = createInProcessHub();
  const t = hub.connect();
  const record = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
  const ctl = new ControllerSession({ session: 'REC234', transport: t });
  const link = new Link(ctl, t, { record, onMount: () => () => undefined, spec: { sex: 'M', ageY: 30, weightKg: 80, comorbid: [] }, mode: 'modeled' } as unknown as AppSession);
  const sv = new ScenarioView();
  sv.doc = doc;
  Object.defineProperty(ctl, 'scenario', { value: sv });
  Object.defineProperty(ctl, 'simT', { value: simT });
  return { link, record };
}

afterEach(() => document.body.replaceChildren());

describe('the Recognised press (D5, the /1 fallback)', () => {
  it('which note it sends: the tamponade card\'s tick text; the haemorrhage /1 card and a free run a `recognised` note; none on a /2 card', () => {
    const tam = tamponade as unknown as ScenarioDoc;
    expect(recognisedNote(tam)).toEqual({ text: tick(tam) });
    expect(tick(tam)).toMatch(/^Objective met: Name the tamponade/); // the text panel/scenario.ts sends for the checkbox
    expect(recognisedNote(haemorrhage as unknown as ScenarioDoc)).toEqual({ text: 'Recognised (instructor)', ev: 'recognised' });
    expect(recognisedNote(null)).toEqual({ text: 'Recognised (instructor)', ev: 'recognised' });
    expect(recognisedNote(mhV2 as unknown as AnyScenarioDoc)).toBeNull();
  });

  it('a press on a free run writes ONE note row { kind: note, ev: recognised } at the sim time; the record keeps "recognised"', async () => {
    const { link, record } = host(null);
    const b = recognisedButton(link, 'btn small');
    document.body.append(b.el);
    b.refresh();
    expect(b.el.textContent).toBe('Recognised');
    expect(b.el.hasAttribute('aria-keyshortcuts')).toBe(false); // no keyboard key (the FX-18 typing guard)
    b.el.click();
    await settle();
    expect(record.data.rows).toEqual([{ t: 30, kind: 'note', text: 'Recognised (instructor)', ev: 'recognised' }]);
    expect(record.data.keeps).toContain('recognised');
    link.close();
  });

  it('a press on the tamponade card writes the tick note (no ev): the Debrief reads it as the objective\'s tick', async () => {
    const { link, record } = host(tamponade as unknown as ScenarioDoc, 130);
    const b = recognisedButton(link, 'btn small');
    b.refresh();
    b.el.click();
    await settle();
    expect(record.data.rows).toEqual([{ t: 130, kind: 'note', text: tick(tamponade as unknown as ScenarioDoc) }]);
    link.close();
  });

  it('the session bar and the Instructor v2 dock carry it beside the marks; neither renders it on a /2 card', async () => {
    for (const [doc, shown] of [[null, true], [tamponade, true], [mhV2, false]] as const) {
      const { link } = host(doc as AnyScenarioDoc | null);
      const bar = document.createElement('header');
      document.body.append(bar);
      const fake = Object.assign(Object.create(link) as Link, { conditions: new Map(), ctl: Object.assign(Object.create(link.ctl), { timeScale: 1, fastForward: null, hostPaused: false, state: null }) });
      const off = mountSessionBar(bar, fake);
      await settle(100);
      const sb = [...bar.querySelectorAll('button')].filter((x) => x.textContent === 'Recognised' && !x.hidden);
      expect(sb.length, `session bar on ${doc ? (doc as { id: string }).id : 'a free run'}`).toBe(shown ? 1 : 0);
      const dock = mountDock(link);
      document.body.append(dock.el);
      dock.refresh();
      const db = [...dock.el.querySelectorAll<HTMLButtonElement>('button')].filter((x) => x.textContent === 'Recognised' && !x.hidden);
      expect(db.length, `dock on ${doc ? (doc as { id: string }).id : 'a free run'}`).toBe(shown ? 1 : 0);
      off();
      link.close();
      document.body.replaceChildren();
    }
  });

  it('on a remote (no host record) both forms show (brief 52: the wire\'s note command carries the event): a free run and a /1 card without a recognition objective send the `recognised` note, the tamponade card its tick; none on a /2 card', async () => {
    for (const [doc, shown, want] of [
      [null, true, { kind: 'marker', text: 'Recognised (instructor)', ev: 'recognised' }],
      [haemorrhage, true, { kind: 'marker', text: 'Recognised (instructor)', ev: 'recognised' }],
      [tamponade, true, { kind: 'marker', text: tick(tamponade as unknown as ScenarioDoc) }],
      [mhV2, false, null],
    ] as const) {
      const name = (doc as { id?: string } | null)?.id ?? 'free run';
      const sent: unknown[] = [];
      const ctl = { scenario: Object.assign(new ScenarioView(), { doc }), simT: 30, send: (c: unknown) => (sent.push(c), Promise.resolve({ accepted: true })), onChange: () => () => undefined };
      const link = new Link(ctl as unknown as ControllerSession, { onMessage: () => () => undefined } as never, null);
      const b = recognisedButton(link, 'btn small');
      expect(b.el.hidden, name).toBe(!shown);
      b.el.click();
      await settle();
      expect(sent, name).toEqual(want ? [{ type: 'note', ...want }] : []);
      link.close();
    }
  });
});
