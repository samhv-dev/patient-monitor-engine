// FX-18: one test for "the user is typing", shared by every single-key shortcut (the `i` reveal here, the demo app's
// Shift+S/P/N/B/?). A tag-name check missed the Debrief notes, a contenteditable div: `i` toggled and ate the letter.
const NOT_TEXT = new Set(['button', 'checkbox', 'radio', 'range', 'submit']);

function isTextField(x: unknown): boolean {
  const el = x as HTMLElement | null;
  if (!el || typeof el.getAttribute !== 'function') return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT') return !NOT_TEXT.has(((el as HTMLInputElement).type || 'text').toLowerCase());
  if (tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
  const role = el.getAttribute('role');
  return role === 'textbox' || role === 'combobox' || role === 'searchbox';
}

/** True when a key press belongs to a text field (its target or the focused element), or to an IME composition. */
export function isTyping(e: KeyboardEvent): boolean {
  return e.isComposing || isTextField(e.target) || isTextField(globalThis.document?.activeElement);
}
