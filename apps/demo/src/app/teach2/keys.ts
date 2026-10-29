// The Instructor v2 keyboard (design §3.1, §3.4, §4; answer 16): Space pauses and resumes through the clock pill (from
// the page, an ACTION row or a header or dock button; elsewhere it is the focused control's own key); Esc
// asks the open sheet to close (the handlers registered last are asked first); the digits 1–9 press the ACTION rows
// (ACTION registers them) and the lower-case letters open sheets (D for the Drug sheet). Shift+S, Shift+P and Shift+N
// send what today's panel sends for them (`panel.ts`), toasts included. No key acts while the user types in a field,
// while a dialog is open, with Ctrl, Cmd or Alt held, on a held-down repeat, or while the view is hidden (today's
// panel is gated the same way, so the two views never both answer one key). `i` stays the reveal gesture's
// (`attachReveal`) and is never registered here.
import { isTyping } from '@pme/controller';
import { alarmRefusal } from '../alarm-caps.ts';
import type { Link } from '../link.ts';
import { toast } from '../ui.ts';

export interface Keys {
  /** The action of digit `n` (1–9), or null to clear it. */
  digit(n: number, fn: (() => void) | null): void;
  /** The action of the lower-case letter `k` (not `i`), or null to clear it. */
  letter(k: string, fn: (() => void) | null): void;
  /** An Esc handler: it returns true when it used the key (a sheet closed). Returns the unregister. */
  escape(fn: () => boolean): () => void;
}

/** The view's keyboard on the document, answering only while `el` is shown. */
export function mountKeys(el: HTMLElement, o: { link: Link; togglePause(): void; doc?: Document }): Keys & { destroy(): void } {
  const doc = o.doc ?? document;
  const digits = new Map<string, () => void>();
  const letters = new Map<string, () => void>();
  const escapes: Array<() => boolean> = [];
  let spaceDown = false; // a Space this view took: its keyup is cancelled too, so a focused button is not also pressed

  // FX-4's wording, as `panel.ts`: a refusal is said too
  const dev = (action: Record<string, unknown>) => void o.link.send({ type: 'device', action } as never).then((r) =>
    toast(!r.accepted ? (action.device === 'alarm' ? alarmRefusal(action.action, r.reason, o.link.alarms?.skin ?? o.link.host?.skin) : `Not done: ${r.reason ?? 'refused'}`)
      : action.action === 'silence' ? 'Alarm sound silenced' : action.action === 'pause' ? 'Alarms paused' : 'NIBP measurement started'));

  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || el.closest('[hidden]') || !el.isConnected) return;
    if ((e.target as Element | null)?.closest?.('dialog[open]')) return;
    const k = e.key;
    let act: (() => void) | undefined;
    if (k === ' ' && !e.shiftKey) {
      // Space pauses only from the page itself, a row of ACTION or a button of the header or the dock (IP9 review L2);
      // on a checkbox, a radio, a select, a summary or any other control it does that control's own thing
      const t = e.target as Element | null;
      if (t && t !== doc.body && t !== doc.documentElement && !t.closest?.('.ip2-row, .ip2-head button, .ip2-dock button')) return;
      act = e.repeat ? () => undefined : o.togglePause;
      spaceDown = true;
    } else if (k === 'Escape') {
      if (![...escapes].reverse().some((f) => f())) return;
      act = () => undefined;
    } else if (e.repeat) return;
    else if (k === 'S') act = () => dev({ device: 'alarm', action: 'silence' });
    else if (k === 'P') act = () => dev({ device: 'alarm', action: 'pause' });
    else if (k === 'N') act = () => dev({ device: 'nibp', action: 'start' });
    else if (/^[1-9]$/.test(k)) act = digits.get(k);
    else if (/^[a-z]$/.test(k)) act = letters.get(k);
    if (!act) return;
    e.preventDefault();
    act();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== ' ' || !spaceDown) return;
    spaceDown = false;
    e.preventDefault();
  };
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('keyup', onKeyUp);
  return {
    digit: (n, fn) => void (fn ? digits.set(String(n), fn) : digits.delete(String(n))),
    letter: (k, fn) => {
      if (k === 'i') throw new Error('`i` is the reveal gesture');
      if (fn) letters.set(k, fn);
      else letters.delete(k);
    },
    escape: (fn) => {
      escapes.push(fn);
      return () => {
        const i = escapes.indexOf(fn);
        if (i >= 0) escapes.splice(i, 1);
      };
    },
    destroy: () => {
      doc.removeEventListener('keydown', onKey);
      doc.removeEventListener('keyup', onKeyUp);
    },
  };
}
