// Plan pump-rack-tci.md A2, Load (§4 D2 item 1, §8): put a syringe on a syringe channel or a bag on a drip channel. The
// list is what the tablet may know: the LABELS of the room's preparations the host sends it (C2 `labels`: drug,
// concentration, volume, the remote that made it and when; never the findings and never what is truly in the syringe,
// the plan's rule "the pump knows the label, not what is in the syringe") in a syringe for a syringe channel and a bag
// for a drip channel, and the formulary's stock items of that kind (S1, PQ7 = B). The command names the choice only —
// the preparation by its maker and id, or the stock id — and the host resolves the true contents (D4). Whether the
// preparation is ready, intact or fits the device's syringe sizes is the host's answer, shown in its words.
import type { Formulary, PumpSource } from '@pme/controller';
import { unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import { clock, h } from '../ui.ts';
import { field, selectOf, type FlowDef, type FlowInput, type PumpLabel } from './form.ts';
import { faceNum, type ChannelKind } from './face.ts';

export const LOAD_WORDS = {
  button: 'Load',
  title: 'Load',
  submit: 'Load',
  done: (ch: number) => `Loaded on channel ${ch}.`,
  what: { syringe: 'Syringe', drip: 'Bag' } satisfies Record<ChannelKind, string>,
  prepared: 'Prepared on a learner remote',
  stock: 'Stock',
  prepText: (drugs: string, ml: string, device: string, at: string) => `${drugs} · ${ml} mL · made on ${device} at ${at}`,
  stockText: (drug: string, ml: string) => `${drug} · ${ml} mL · stock`,
  none: (kind: ChannelKind) => `No ${kind === 'syringe' ? 'syringe' : 'bag'} to load: prepare one on a learner remote's bench.`,
};

/** A container a channel of `kind` takes (the host's rule, pump-host.ts resolveSource, mirrored for the list only). */
const fits = (kind: ChannelKind, container: string): boolean => (kind === 'syringe' ? container === 'syringe-pp' : container === 'bag-pvc' || container === 'bag-polyolefin');
const perMlText = (amount: number, unit: string, perMl: number): string => `${faceNum(amount / perMl)} ${unitText(unit)}/mL`;

export interface LoadChoice {
  value: string;
  text: string;
  source: PumpSource;
}
/** What a channel of `kind` may load: the labels of preparations in its container, then the stock items of its kind. */
export function loadChoices(kind: ChannelKind, labels: readonly PumpLabel[], f: Formulary | null): LoadChoice[] {
  const out: LoadChoice[] = [];
  for (const l of labels) {
    if (!fits(kind, l.container)) continue;
    const drugs = l.actives.map((a) => `${drugName(a.drugId)} ${perMlText(a.amount, a.unit, a.perMl)}`).join(' + ');
    out.push({ value: `prep|${l.device}|${l.id}`, text: LOAD_WORDS.prepText(drugs, faceNum(l.volumeMl), l.device, clock(l.madeAt)), source: { prep: { device: l.device, id: l.id } } });
  }
  for (const s of (kind === 'syringe' ? f?.stock.syringes : f?.stock.bags) ?? []) {
    const p = f?.drugs[s.drugId]?.products.find((x) => x.id === s.product);
    const strength = p ? ` ${perMlText(p.strength.amount, p.strength.unit, 1)}` : '';
    out.push({ value: `stock|${s.id}`, text: LOAD_WORDS.stockText(`${drugName(s.drugId)}${strength}`, faceNum(s.volumeMl.ml)), source: { stock: s.id } });
  }
  return out;
}

function loadFlow(x: FlowInput) {
  const choices = loadChoices(x.kind, x.labels, x.formulary);
  const sel = selectOf('source', choices.map((c) => [c.value, c.text] as const));
  const el = h('div', { class: 'pf-fields-in' }, choices.length ? field(LOAD_WORDS.what[x.kind], sel) : h('p', { class: 'pf-hint small' }, LOAD_WORDS.none(x.kind)));
  return {
    el,
    build() {
      const c = choices.find((k) => k.value === sel.value);
      if (!c) return { why: LOAD_WORDS.none(x.kind) };
      return x.kind === 'syringe' ? { type: 'pump' as const, ch: x.ch, action: 'load', syringe: c.source } : { type: 'pump' as const, ch: x.ch, action: 'load', bag: c.source };
    },
  };
}

export const LOAD: FlowDef = { id: 'load', button: LOAD_WORDS.button, title: LOAD_WORDS.title, submit: LOAD_WORDS.submit, done: LOAD_WORDS.done, kinds: ['syringe', 'drip'], make: loadFlow };
