// The token table of research/13 brief §6.2, re-computed from app.css (brief §11.4: "contrast table re-computed from
// the token file"). Text pairs need 4.5:1, control boundaries and the focus ring 3:1 (WCAG 2.2 1.4.3, 1.4.11).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from './color.ts';

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
function block(selector: string): Record<string, string> {
  const i = css.indexOf(`${selector} {`);
  const body = css.slice(i, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1] as string, m[2] as string]));
}
const dark = block(':root');
const light = { ...dark, ...block(".bench, :root[data-theme='bench']") };

describe('design tokens (brief §6.2)', () => {
  for (const [name, t] of [['dark theatre', dark], ['light bench', light]] as const) {
    it(`${name}: text 4.5:1 on every surface it is used on; boundaries and focus 3:1`, () => {
      const c = (a: string, b: string) => contrast(t[a] as string, t[b] as string);
      for (const s of ['bezel-0', 'bezel-1', 'bezel-2', 'bezel-3']) {
        expect(c('text', s), `text on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('text-strong', s), `text-strong on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('text-muted', s), `text-muted on ${s}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const s of ['bezel-0', 'bezel-1', 'bezel-2']) {
        expect(c('accent', s), `accent text on ${s}`).toBeGreaterThanOrEqual(4.5);
        expect(c('line-strong', s), `control boundary on ${s}`).toBeGreaterThanOrEqual(3);
        expect(c('accent-strong', s), `focus ring on ${s}`).toBeGreaterThanOrEqual(3);
      }
      expect(c('on-accent', 'accent'), 'text on the accent fill').toBeGreaterThanOrEqual(4.5);
      expect(c('danger', 'bezel-1'), 'destructive button text').toBeGreaterThanOrEqual(4.5);
    });
  }
  it('the monitor screen is true black and no alarm colour is a shell token', () => {
    expect(dark.screen).toBe('#000');
    expect(Object.keys(dark).filter((k) => k.startsWith('alarm-'))).toEqual(['alarm-high-bg', 'alarm-high-fg', 'alarm-medium-bg', 'alarm-medium-fg', 'alarm-low-bg', 'alarm-low-fg']); // defaults only; replaced from the skin
  });
});
