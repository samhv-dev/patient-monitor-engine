// Instructor v2, the sheet frame (design §4, board "Proposal v11"; plan IP7): every sheet has the same shape. A title row
// (the name, the keyboard hint, close), the group tabs on their own row, a body read on the left and set on the right,
// the staging tray ("Staged · n", shared by every sheet), and a footer with the primary button(s): Deliver bottom left,
// the sheet's own primary bottom right. The frame slides up over ACTION only (the sheets layer, teach2.css); STATE stays
// in view. It is a non-modal dialog: the keys of the view keep working behind it (digits press the ACTION rows).
import { h, setText } from '../ui.ts';

export interface SheetFrame {
  readonly id: string;
  el: HTMLElement;
  /** The body's two halves: read (left) and set (right). */
  left: HTMLElement;
  right: HTMLElement;
  /** Where the shared tray and the Deliver button are placed while this sheet is open (sheets.ts moves them in). */
  tray: HTMLElement;
  deliverSlot: HTMLElement;
  /** The sheet's own primary buttons and hint (bottom right). */
  primary: HTMLElement;
  /** Draw the group tabs; `onSelect` is called with a group's id when one is chosen. */
  groups(list: ReadonlyArray<[string, string]>, current: string, onSelect: (id: string) => void): void;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
}

/** A sheet frame named `name` (also its dialog label "<name> sheet"), with its keyboard hint and a close action. */
export function sheetFrame(o: { id: string; name: string; hint: string; onClose(): void }): SheetFrame {
  const close = h('button', { type: 'button', class: 'ip2-sheet-close', 'aria-label': `Close the ${o.name} sheet`, onclick: () => o.onClose() }, '✕');
  const head = h('div', { class: 'ip2-sheet-head' },
    h('h2', { class: 'ip2-sheet-name', id: `ip2-sheet-${o.id}-h` }, o.name), h('span', { class: 'ip2-spacer' }), h('span', { class: 'ip2-sheet-hint' }, o.hint), close);
  const tabs = h('div', { class: 'ip2-sheet-tabs', role: 'tablist', 'aria-label': `${o.name} groups` });
  const left = h('div', { class: 'ip2-sheet-left' });
  const right = h('div', { class: 'ip2-sheet-right' });
  const tray = h('div', { class: 'ip2-sheet-tray' });
  const deliverSlot = h('span', { class: 'ip2-sheet-deliver' });
  const primary = h('span', { class: 'ip2-sheet-primary' });
  const el = h('section', { class: 'ip2-sheet', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': `ip2-sheet-${o.id}-h`, 'data-sheet': o.id, hidden: true },
    head, tabs, h('div', { class: 'ip2-sheet-body' }, left, right), tray, h('div', { class: 'ip2-sheet-foot' }, deliverSlot, h('span', { class: 'ip2-spacer' }), primary));
  let shown = false;
  return {
    id: o.id, el, left, right, tray, deliverSlot, primary,
    groups: (list, current, onSelect) => {
      tabs.hidden = !list.length;
      const want = list.map(([id]) => id).join('|');
      if (tabs.dataset.ids !== want) {
        tabs.dataset.ids = want;
        tabs.replaceChildren(...list.map(([id, label]) => h('button', { type: 'button', role: 'tab', class: 'ip2-sheet-tab', 'data-group': id, onclick: () => onSelect(id) }, label)));
      }
      for (const b of tabs.querySelectorAll<HTMLButtonElement>('[role=tab]')) {
        b.setAttribute('aria-selected', String(b.dataset.group === current));
        b.tabIndex = b.dataset.group === current ? 0 : -1;
        const label = list.find(([id]) => id === b.dataset.group)?.[1];
        if (label) setText(b, label);
      }
    },
    get isOpen() {
      return shown;
    },
    open: () => {
      shown = true;
      el.hidden = false;
    },
    close: () => {
      shown = false;
      el.hidden = true;
    },
  };
}
