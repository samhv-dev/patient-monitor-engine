// @vitest-environment happy-dom
// Repainting in place (keep.ts): the shared text writer and list keeper, and the test helper every surface's repaint
// test leans on (keep.testing.ts), which must see each way a press is lost.
import { describe, expect, it } from 'vitest';
import { keepOrder, keyed, setText } from './keep.ts';
import { disturbed, liveWrites } from './keep.testing.ts';

const button = (text: string) => Object.assign(document.createElement('button'), { textContent: text });

describe('setText', () => {
  it('writes into the existing text node, also when the text changes, and writes nothing when it is the same', async () => {
    const b = button('due 1:53');
    document.body.replaceChildren(b);
    const node = b.firstChild;
    expect(await disturbed([b], () => setText(b, 'due 1:52'))).toEqual([]);
    expect([b.firstChild, b.textContent]).toEqual([node, 'due 1:52']);
    expect(await liveWrites([b], () => setText(b, 'due 1:52'))).toEqual([0]);
  });

  it('writes a text node given itself, fills an empty element, and replaces mixed content whole', () => {
    const t = document.createTextNode('a');
    setText(t, 'b');
    expect(t.data).toBe('b');
    const e = document.createElement('span');
    setText(e, 'x');
    expect(e.textContent).toBe('x');
    e.append(document.createElement('i'));
    setText(e, 'y');
    expect(e.childNodes.length).toBe(1);
    expect(e.textContent).toBe('y');
  });
});

describe('keyed', () => {
  it('makes each key once, keeps it while wanted and drops the others', () => {
    const cache = new Map<string, { k: string }>();
    const made: string[] = [];
    const make = (k: string) => (made.push(k), { k });
    const [a] = keyed(cache, ['a', 'b'], make);
    expect(keyed(cache, ['c', 'a'], make)[1]).toBe(a);
    expect([made, [...cache.keys()].sort()]).toEqual([['a', 'b', 'c'], ['a', 'c']]);
  });
});

describe('keepOrder', () => {
  it('a row inserted above the others moves none of them', async () => {
    const ul = document.createElement('ul');
    const rows = ['b', 'c'].map((t) => Object.assign(document.createElement('li'), { textContent: t }));
    ul.append(...rows);
    document.body.replaceChildren(ul);
    const a = Object.assign(document.createElement('li'), { textContent: 'a' });
    expect(await disturbed(rows, () => keepOrder(ul, [a, ...rows]))).toEqual([]);
    expect(ul.textContent).toBe('abc');
  });
});

describe('the repaint test helper sees every way a press is lost', () => {
  it('a text node replaced, a node put back at the same place, a node replaced, and the focus taken', async () => {
    const b = button('40');
    const ul = document.createElement('ul');
    ul.append(b);
    document.body.replaceChildren(ul);
    expect(await disturbed([b], () => (b.textContent = '40'))).toHaveLength(1);
    expect(await disturbed([b], () => ul.insertBefore(b, null))).toHaveLength(1);
    expect(await disturbed([b], () => ul.replaceChildren(b))).toHaveLength(1);
    b.focus();
    expect(await disturbed([b], () => ul.replaceChildren(button('40')))).toEqual([expect.stringContaining('button'), expect.stringMatching(/^focus left/)]);
    const live = Object.assign(document.createElement('p'), { textContent: 'x' });
    document.body.replaceChildren(live);
    expect(await liveWrites([live], () => (live.textContent = 'x'))).toEqual([2]);
  });
});
