// The mechanism tree (docs/plans/mechanism-tree.md piece T1; Q12: `#/explore/mechanisms`, the last entry of Explore's
// left nav): for one of the six first triggers, the static forward tree of the couplings the engine computes, drawn
// from the coupling registry (mechanisms/registry-data.ts) as an SVG string (mechanisms/svg.ts), with a legend that says
// in words what each stroke means. No live data yet (pieces L1/L2): the page says so. Node words come from the glossary
// where it has the key, else the registry's declared label, else the engine key. Persian (Q13): the SVG's strings are
// matched through fa-match.mjs as they are built, the page's other text through the DOM pass, and the draft line stands
// while any entry printed is unread by the clinical owner.
// Brief 104 (T1b), the owner's feedback on T1 ("too crowded"; "the physiological parts must carry clinical labels"): a
// node shows its clinical label (mechanisms/labels.ts; the glossary's where it has one) and its unit, never its engine
// key (in the tooltip only), with the line "labels under the owner's review" while a drawn label is unreviewed; the
// default view is the trigger and 4 generations (P-1) past it, with "+n" on a node to draw one generation more, the
// monitor's values folded into one box, a node's children beyond six folded into "n more", a "path to…" picker, and
// the whole tree one button away (mechanisms/graph.ts view()). Print takes the view as drawn.
import { DRAFT_LINE, faPass, faText, translateTree, unreviewed } from '../i18n/fa-dom.ts';
import { hostLang, setHostLang, type HostLang } from '../i18n/lang.ts';
import { DEPTH, mechanismTree, view, type DrawClass, type TreeData, type ViewState } from '../mechanisms/graph.ts';
import { clinicalLabel } from '../mechanisms/clinical.ts';
import { nodeLabel, REVIEW_LINE } from '../mechanisms/labels.ts';
import { REGISTRY } from '../mechanisms/registry-data.ts';
import { treeSvg } from '../mechanisms/svg.ts';
import { button, h, seg, setText } from '../ui.ts';

/** The six first triggers (plan Q8). The circulation's `tensionPtx` condition is an alias the engine routes to the lung
 *  condition (its one registry row says so), so the picker lists the lung condition once. */
export const PICKER = ['trigger.bleed', 'trigger.drug.propofol', 'trigger.drug.phenylephrine', 'trigger.drug.esmolol', 'trigger.lungCondition.ptxTension', 'trigger.ventilation.peep'] as const;
const PICKER_WORDS: Readonly<Record<(typeof PICKER)[number], string>> = {
  'trigger.bleed': 'Haemorrhage',
  'trigger.drug.propofol': 'Propofol bolus',
  'trigger.drug.phenylephrine': 'Phenylephrine bolus',
  'trigger.drug.esmolol': 'Esmolol bolus',
  'trigger.lungCondition.ptxTension': 'Tension pneumothorax',
  'trigger.ventilation.peep': 'PEEP change on the ventilator',
};

export const TITLE = 'Mechanism tree';
export const INTRO = 'For one trigger, the couplings the engine computes, from the trigger at the left to what the monitor shows at the right, read from the coupling registry. Each edge says whether its size is sourced, fitted or an engineering choice, or that the engine does not have the mechanism at all.';
export const NO_LIVE = 'No live data yet: the tree shows which couplings exist, not how large each one is in this patient now.';
/** The legend, in words (D7): each stroke and shape, with a swatch drawn by the same CSS as the tree. */
export const LEGEND: ReadonlyArray<{ cls?: DrawClass; shape?: string; words: string }> = [
  { cls: 'SOURCED', words: 'solid: sourced, every constant on the edge cites a source' },
  { cls: 'FIT', words: 'fitted: the size is fitted, not sourced (dotted)' },
  { cls: 'ENG', words: 'engineering choice: a value chosen for the engine, not from a source (dash-dot)' },
  { cls: 'UNTAGGED', words: 'untagged: a constant on the edge has neither a source nor a tag (solid, marked ?)' },
  { cls: 'NONE', words: 'thin: no constant, a hand-off of a value or numbers written in the code' },
  { cls: 'ABSENT', words: 'absent: the engine does not have this mechanism (dashed, with the audit finding)' },
  { shape: 'feedback', words: 'feedback: the edge closes a loop and runs back under the columns' },
  { shape: 'trigger', words: 'pill: the trigger' },
  { shape: 'effector', words: 'double box: an effector, a parameter assembled from factors' },
  { shape: 'observable', words: 'heavy box: what the monitor shows' },
  { shape: 'loop', words: '⟲ rounded box: a reflex drawn as one loop (its states inside, its effects outside)' },
  { shape: 'absentNode', words: 'dashed box: a mechanism the engine does not have' },
];
export const HINT = 'Hover or focus an edge to read its rows, its constants and their sources and tags; a node, to read what it is and its engine keys.';
export const HOW = 'The tree opens at the trigger and 4 generations past it. “+n” on a node draws one generation more from it; “+ n more” opens the rest of a node\'s effects (six are shown, the best-sourced first); “▸ Monitor values” opens what the monitor shows. “Path to” keeps only the paths to one monitor value.';

const about = (id: string): { unit: string; meaning: string } | undefined => nodeLabel(id);

const swatch = (l: (typeof LEGEND)[number]): string => {
  if (l.cls) return `<svg class="mt-svg mt-sw" width="44" height="12" viewBox="0 0 44 12" aria-hidden="true"><g class="mt-e" data-class="${l.cls}"><path class="mt-line" d="M2 6H42"/></g></svg>`;
  if (l.shape === 'feedback') return '<svg class="mt-svg mt-sw" width="44" height="12" viewBox="0 0 44 12" aria-hidden="true"><g class="mt-e mt-fb" data-class="NONE"><path class="mt-line" d="M38 1V10H6V1"/></g></svg>';
  const kind = l.shape === 'absentNode' ? 'effector" data-absent="x' : l.shape;
  const rx = l.shape === 'trigger' ? 6 : l.shape === 'loop' ? 4 : 1;
  const inner = l.shape === 'effector' ? '<rect class="mt-box2" x="4" y="2.5" width="36" height="7" rx="1"/>' : '';
  return `<svg class="mt-svg mt-sw" width="44" height="12" viewBox="0 0 44 12" aria-hidden="true"><g class="mt-n" data-kind="${kind}"><rect class="mt-box" x="2" y="1" width="40" height="10" rx="${rx}"/>${inner}</g></svg>`;
};

export interface MechanismsPanel {
  el: HTMLElement;
  /** Draw (again) for the chosen trigger, view and the host's language. */
  draw(): void;
  readonly trigger: string;
}

export function mechanismsPanel(data: TreeData = REGISTRY): MechanismsPanel {
  let trigger: string = 'trigger.drug.propofol';
  // the view: what is opened, the path filter, the whole tree (reset when the trigger changes)
  let expanded = new Set<string>();
  let opened = new Set<string>();
  let pathTo = '';
  let whole = false;
  const reset = (): void => void ((expanded = new Set()), (opened = new Set()), (pathTo = ''), (whole = false));
  const select = h('select', { id: 'mt-trigger', onchange: () => ((trigger = select.value), reset(), draw()) },
    ...PICKER.map((p) => h('option', { value: p }, PICKER_WORDS[p])));
  select.value = trigger;
  const pathSel = h('select', { id: 'mt-path', onchange: () => ((pathTo = pathSel.value), (whole = false), draw()) });
  const langSwitch = seg<HostLang>('Language of the page', [['en', 'English'], ['fa', 'فارسی']], hostLang(), (l) => (setHostLang(l), draw()));
  langSwitch.lang = 'en';
  const draft = h('p', { class: 'mt-draft', lang: 'en', dir: 'ltr', hidden: true }, DRAFT_LINE);
  const review = h('p', { class: 'mt-review', lang: 'en', dir: 'ltr' }, REVIEW_LINE);
  const triggerLabel = h('label', { for: 'mt-trigger' }, 'Trigger');
  const pathLabel = h('label', { for: 'mt-path' }, 'Path to');
  const wholeBtn = button('Whole tree', () => ((whole = true), (pathTo = ''), draw()), 'small');
  const defaultBtn = button('Default view', () => (reset(), draw()), 'small');
  wholeBtn.id = 'mt-whole';
  defaultBtn.id = 'mt-default';
  const tools = h('div', { class: 'row mt-tools' }, triggerLabel, select, pathLabel, pathSel, wholeBtn, defaultBtn);
  const fig = h('div', { class: 'mt-fig' });
  const detail = h('p', { class: 'mt-detail', 'aria-live': 'polite' }, HINT);
  // rebuilt in English on every draw, then put through the DOM's Persian pass when the page is in Persian
  const text = h('div', { class: 'mt-text' });
  const legendBox = h('div', { class: 'mt-legend-box' });

  const show = (ev: Event): void => {
    const g = (ev.target as Element | null)?.closest?.('.mt-more, .mt-e, .mt-n');
    const words = g?.querySelector(':scope > title')?.textContent;
    if (words) setText(detail, words);
  };
  fig.addEventListener('focusin', show);
  fig.addEventListener('mouseover', show);
  // "+n" draws one generation more from its node; a device box or "n more" opens its fold (click, Enter or Space)
  const act = (ev: Event): void => {
    const el = ev.target as Element | null;
    const more = el?.closest?.('[data-expand]');
    const open = more ? null : el?.closest?.('[data-open]');
    if (!more && !open) return;
    if (ev instanceof KeyboardEvent) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
    }
    const id = (more ?? open)?.getAttribute(more ? 'data-expand' : 'data-open') as string;
    if (more) expanded.add(id);
    else opened.add(id);
    draw();
    // keep the focus where the reader was: on the node that was opened, or the first drawn child of a fold's parent
    const back = fig.querySelector(`.mt-n[data-key="${CSS.escape(more ? id : (id.startsWith('more.') ? id.slice(5) : id))}"]`) as SVGGElement | null;
    back?.focus?.();
  };
  fig.addEventListener('click', act);
  fig.addEventListener('keydown', act);

  function draw(): void {
    const fa = hostLang() === 'fa';
    langSwitch.set(fa ? 'fa' : 'en');
    const p = faPass();
    const t = fa ? (en: string) => faText(en, p) ?? en : (en: string) => en;
    const tree = mechanismTree(data, trigger, clinicalLabel);
    const state: ViewState = { expanded, opened, ...(pathTo ? { pathTo } : {}), whole };
    const shown = view(tree, state);
    const { svg } = treeSvg(shown, { t, about });
    fig.innerHTML = svg;
    const fb = tree.edges.filter((e) => e.feedback).length;
    const absent = tree.edges.filter((e) => e.absent).length;
    const big = tree.loops[0]?.length ?? 0;
    const target = tree.nodes.find((n) => n.id === pathTo)?.label ?? pathTo;
    const drawnLine = whole
      ? `Drawn: the whole tree, ${shown.nodes.length} nodes.`
      : pathTo
        ? `Drawn: the ${shown.nodes.length} nodes on the paths from the trigger to ${target}.`
        : `Drawn: ${tree.nodes.length - shown.hidden} of the ${tree.nodes.length} nodes, the trigger and ${DEPTH} generations past it${expanded.size || opened.size ? ', with what you opened' : ''}.`;
    text.replaceChildren(
      h('p', { class: 'lede' }, INTRO),
      h('p', { class: 'mt-nolive' }, NO_LIVE),
      h('p', { class: 'hint mt-counts' }, `${tree.nodes.length} nodes, ${tree.edges.length} edges: ${fb} feedback, ${absent} absent. ${big ? `${big} of the nodes lie on one feedback system (each reaches every other).` : 'No loop.'}`),
      h('p', { class: 'hint mt-drawn' }, drawnLine),
      h('p', { class: 'hint mt-how' }, HOW));
    legendBox.replaceChildren(h('h2', {}, 'Legend'), h('ul', { class: 'mt-legend' }, ...LEGEND.map((l) => {
      const li = h('li', {}, h('span', { class: 'mt-words' }, l.words));
      li.insertAdjacentHTML('afterbegin', swatch(l));
      return li;
    })));
    detail.textContent = HINT;
    triggerLabel.textContent = t('Trigger');
    pathLabel.textContent = t('Path to');
    for (const o of select.options) o.textContent = t(PICKER_WORDS[o.value as (typeof PICKER)[number]]);
    pathSel.replaceChildren(h('option', { value: '' }, t('— (the default view)')),
      ...tree.nodes.filter((n) => n.kind === 'observable').map((n) => h('option', { value: n.id }, t(n.label))));
    pathSel.value = pathTo;
    for (const x of [text, legendBox, detail]) {
      if (fa) x.setAttribute('lang', 'fa'), x.setAttribute('dir', 'rtl'), translateTree(x, p);
      else x.removeAttribute('lang'), x.removeAttribute('dir');
    }
    draft.hidden = !(fa && unreviewed(p));
    // every drawn node's label (a loop, box or fold has none of its own): the line stands while one is unreviewed
    review.hidden = !shown.nodes.some((n) => nodeLabel(n.id)?.reviewed === false);
  }

  const el = h('div', { class: 'mt-page' }, h('div', { class: 'row between' }, tools, langSwitch), draft, review, text, fig, detail, legendBox);
  draw();
  return { el, draw, get trigger() { return trigger; } };
}
