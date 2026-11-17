// The instructor's view of the pump rack: every channel as the engine holds it, read-only. Each channel of Room setup's
// rack, and any channel the engine still runs above it, with its programme, its rate or TCI target, what it has infused,
// its state and its alarms; under a TCI channel the pump's predicted Cp and Ce beside the patient's own for that drug
// (every route's); a syringe or bag that holds another drug than its programme says what it truly holds; a line where
// two channels hold one drug (the patient receives their sum). Then each drug given so far, in the Debrief's own words
// (Link.givenLines). Nothing here changes a channel.
import type { DrugPanelRow, DrugsEvent, PumpConcentration, PumpPanelRow } from '@pme/engine-core';
import { unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { pumpAlarmText } from '../pump-alarms.ts';
import { FACE_LABELS, faceNum } from '../pump/face.ts';
import { tciModelName } from '../tci-names.ts';
import { h, keepOrder, keyed, setText } from '../ui.ts';
import type { PanelCtx } from './ctx.ts';

export const PUMPS_WORDS = {
  list: 'Pump channels',
  empty: 'This room has no pump rack.',
  notLoaded: 'Nothing loaded',
  holds: (what: string) => `Holds ${what}: not what it is programmed with`,
  rate: (rate: string) => `Rate ${rate}`,
  tci: (model: string, mode: string, target: string) => `TCI ${model}, ${mode} target ${target}`,
  tciStopped: (model: string) => `TCI ${model} stopped`,
  infused: (ml: string, left: string) => `Infused ${ml} mL · ${left} mL left`,
  predicted: (site: 'Cp' | 'Ce', pred: string, patient: string) => `Predicted ${site} ${pred} · the patient's, all routes: ${patient}`,
  together: (chs: string, drug: string) => `Channels ${chs} both hold ${drug}: the patient receives their sum.`,
  elsewhere: 'Amounts given are read on the instructor\'s computer.',
  noAlarm: 'No alarm',
  givenTitle: 'Given so far',
  givenNone: 'No drug given yet.',
};

const concText = (drugId: string, c: PumpConcentration): string => `${drugName(drugId)} ${FACE_LABELS.perMl(faceNum(c.amount / c.perMl), unitText(c.unit))}`;

/** The channels to show: the rack's, and any the engine holds beyond it (a running channel is never hidden). */
export function channelsOf(rack: readonly PumpPanelRow['kind'][], rows: readonly PumpPanelRow[]): Array<{ ch: number; kind: PumpPanelRow['kind']; row: PumpPanelRow | null }> {
  const byCh = new Map(rows.map((r) => [r.ch, r]));
  const chs = [...new Set([...rack.map((_, i) => i + 1), ...rows.map((r) => r.ch)])].sort((a, b) => a - b);
  return chs.map((ch) => ({ ch, kind: byCh.get(ch)?.kind ?? rack[ch - 1] ?? 'syringe', row: byCh.get(ch) ?? null }));
}

/** A channel's lines, in the order they are shown. */
export function channelLines(r: PumpPanelRow | null, drugs: readonly DrugPanelRow[]): { what: string; holds: string | null; how: string; infused: string; tci: string[]; alarms: string } {
  if (!r || r.state === 'notLoaded') return { what: PUMPS_WORDS.notLoaded, holds: null, how: '', infused: '', tci: [], alarms: PUMPS_WORDS.noAlarm };
  const what = r.programmed ? concText(r.programmed.drugId, r.programmed.concentration) : FACE_LABELS.notProgrammed;
  const c = r.contents;
  const p = r.programmed;
  const differs = c && (!p || c.drugId !== p.drugId || c.concentration.amount / c.concentration.perMl !== p.concentration.amount / p.concentration.perMl || c.concentration.unit !== p.concentration.unit);
  const t = r.tci;
  const how = r.mode === 'tci' && t
    ? t.mode && t.target !== null ? PUMPS_WORDS.tci(tciModelName(t.setId), FACE_LABELS.tciMode[t.mode], `${faceNum(t.target)} ${unitText(t.unit)}`) : PUMPS_WORDS.tciStopped(tciModelName(t.setId))
    : r.rate ? PUMPS_WORDS.rate(`${faceNum(r.rate.rate)} ${unitText(r.rate.unit)}${r.rate.unit === 'mL/h' ? '' : ` (${faceNum(r.rateMlH)} mL/h)`}`) : '';
  const patient = c ? drugs.find((d) => d.id === c.drugId) : undefined;
  const truth = (v: number | undefined) => (patient && v !== undefined ? `${faceNum(v)} ${unitText(patient.unit)}${p && c && p.drugId !== c.drugId ? ` (${drugName(c.drugId)})` : ''}` : FACE_LABELS.dash);
  const tci = t ? [PUMPS_WORDS.predicted('Cp', `${faceNum(t.cp)} ${unitText(t.unit)}`, truth(patient?.cp)), PUMPS_WORDS.predicted('Ce', `${faceNum(t.ce)} ${unitText(t.unit)}`, truth(patient?.ce))] : [];
  return {
    what, holds: differs && c ? PUMPS_WORDS.holds(concText(c.drugId, c.concentration)) : null, how,
    infused: PUMPS_WORDS.infused(faceNum(r.infusedMl), faceNum(r.volumeMl)), tci,
    alarms: r.alarms.length ? r.alarms.map((a) => pumpAlarmText(r.ch, r, a)).join(' · ') : PUMPS_WORDS.noAlarm,
  };
}

/** The information lines of the rack: each drug that two or more loaded channels hold (they add, as one infusion). */
export function togetherLines(rows: readonly PumpPanelRow[]): string[] {
  const by = new Map<string, number[]>();
  for (const r of rows) if (r.contents) by.set(r.contents.drugId, [...(by.get(r.contents.drugId) ?? []), r.ch]);
  return [...by].filter(([, chs]) => chs.length > 1).map(([id, chs]) => PUMPS_WORDS.together(`${chs.slice(0, -1).join(', ')} and ${chs.at(-1)}`, drugName(id)));
}

/** What each running drug is running by, as the engine runs it: its rate, and each source by what it holds (a pump
 *  channel running at a rate or in TCI, an infusion off the pumps as the host's record has it, else a bolus being given
 *  over time). `offPumps`: the drugs with an infusion or TCI off the pumps on the kept course. */
export type RunningLine = { drugId: string; text: string; pumps: number };

export function runningLines(e: DrugsEvent | null, offPumps: ReadonlySet<string>): RunningLine[] {
  if (!e) return [];
  const chans = (e.pumps ?? []).filter((r) => r.contents && r.state === 'running' && (r.mode === 'tci' || r.rateMlH > 0));
  return e.drugs.filter((d) => (d.rate ?? 0) > 0).map((d) => {
    const by = chans.filter((r) => r.contents?.drugId === d.id).map((r) => `pump channel ${r.ch}${r.programmed && r.programmed.drugId !== d.id ? ` (programmed as ${drugName(r.programmed.drugId)})` : ''}`);
    const pumps = by.length;
    if (offPumps.has(d.id)) by.push('an infusion off the pumps');
    return { drugId: d.id, pumps, text: `${drugName(d.id)} ${faceNum(d.rate ?? 0)} ${unitText(d.rateUnit ?? '')}: ${by.length ? by.join(' and ') : 'a bolus being given over time'}` };
  });
}

interface ChannelEl { li: HTMLElement; head: HTMLElement; state: HTMLElement; lines: HTMLElement[]; tci: HTMLElement; alarm: HTMLElement }

/** The view on `link`: a list of channels, then the amounts given. */
export function pumpsView(link: Pick<Link, 'drugs' | 'rack' | 'givenLines'>): { el: HTMLElement; refresh(): void } {
  const list = h('ul', { class: 'pumps-list', 'aria-label': PUMPS_WORDS.list });
  const empty = h('p', { class: 'muted' }, PUMPS_WORDS.empty);
  const together = h('ul', { class: 'pumps-together' });
  const given = h('ul', { class: 'pumps-given' });
  const el = h('div', { class: 'pumps-view' }, empty, list, together, h('h3', {}, PUMPS_WORDS.givenTitle), given);
  const fill = (ul: HTMLElement, lines: readonly string[], none: string | null) => {
    const want = lines.length ? lines : none ? [none] : [];
    if ([...ul.children].map((li) => li.textContent).join('\n') !== want.join('\n')) ul.replaceChildren(...want.map((s) => h('li', s === none ? { class: 'muted' } : {}, s)));
  };
  const cache = new Map<string, ChannelEl>();
  const make = (key: string): ChannelEl => {
    const head = h('h4', { id: `pumps-ch-${key}` });
    const state = h('span', { class: 'pumps-state' });
    const lines = [h('div', {}), h('div', { class: 'pumps-holds' }), h('div', {}), h('div', {})];
    const tci = h('div', { class: 'pumps-tci' });
    const alarm = h('div', { class: 'pumps-alarm' });
    const li = h('li', { class: 'pumps-ch', 'aria-labelledby': head.id }, h('div', { class: 'pumps-head' }, head, state), ...lines, tci, alarm);
    return { li, head, state, lines, tci, alarm };
  };
  const refresh = () => {
    const drugs = link.drugs?.drugs ?? [];
    const chs = channelsOf(link.rack, link.drugs?.pumps ?? []);
    empty.hidden = chs.length > 0;
    const els = keyed(cache, chs.map((c) => String(c.ch)), make);
    chs.forEach((c, i) => {
      const x = els[i] as ChannelEl;
      const l = channelLines(c.row, drugs);
      const st = c.row?.state ?? 'notLoaded';
      x.li.dataset.state = st;
      setText(x.head, FACE_LABELS.channel(c.ch, FACE_LABELS.kind[c.kind]));
      setText(x.state, FACE_LABELS.state[st]);
      [l.what, l.holds ?? '', l.how, l.infused].forEach((s, k) => {
        const line = x.lines[k] as HTMLElement;
        setText(line, s);
        line.hidden = !s;
      });
      setText(x.tci, l.tci.join('\n'));
      x.tci.hidden = !l.tci.length;
      setText(x.alarm, l.alarms);
      x.alarm.dataset.on = String(!!c.row?.alarms.length);
    });
    keepOrder(list, els.map((x) => x.li));
    fill(together, togetherLines(link.drugs?.pumps ?? []), null);
    const g = link.givenLines();
    fill(given, g ?? [], g ? PUMPS_WORDS.givenNone : PUMPS_WORDS.elsewhere);
  };
  refresh();
  return { el, refresh };
}

/** The view as a panel tab body (the phone's Pumps tab, the laptop's Pumps sheet). */
export function pumpsTab(c: PanelCtx): HTMLElement {
  const v = pumpsView(c.link);
  c.onRefresh(v.refresh);
  return v.el;
}
