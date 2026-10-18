// @vitest-environment happy-dom
// FX-18: the shared "is the user typing" test behind every single-key shortcut (the Debrief notes are a contenteditable div).
import { afterEach, describe, expect, it } from 'vitest';
import { isTyping } from '../../src/panel/keys.ts';

const press = (target: Element, o: KeyboardEventInit = {}) => {
  let got: boolean | null = null;
  target.addEventListener('keydown', (e) => (got = isTyping(e as KeyboardEvent)), { once: true });
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, ...o }));
  return got;
};
const make = (html: string) => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
};

describe('isTyping', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('is true in a text input, a textarea, a select, a contenteditable div and a role=textbox element', () => {
    for (const html of ['<input>', '<input type="search">', '<textarea></textarea>', '<select><option>a</option></select>',
      '<div contenteditable="true"></div>', '<div role="textbox" tabindex="0"></div>']) expect(press(make(html)), html).toBe(true);
  });

  it('is false on a plain div, a button and a checkbox', () => {
    for (const html of ['<div tabindex="0"></div>', '<button>Go</button>', '<input type="checkbox">']) expect(press(make(html)), html).toBe(false);
  });

  it('is true when the focused element is a field though the event reached another element, and during IME composition', () => {
    const notes = make('<div contenteditable="true" tabindex="0"></div>');
    notes.focus();
    const other = document.createElement('div');
    document.body.append(other);
    expect(press(other)).toBe(true);
    notes.blur();
    expect(press(other)).toBe(false);
    expect(press(other, { isComposing: true })).toBe(true);
  });
});
