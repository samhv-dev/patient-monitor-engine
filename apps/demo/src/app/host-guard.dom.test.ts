// @vitest-environment happy-dom
// Post-demo: a second instructor tab of the same browser does not start a new session silently (host-guard.ts). Host A
// lives on the channel; a new tab without `?session=` is asked; "Open that tab's session here" runs A's code with A's
// kept case, and A stops; "Start a new session" runs a new code and A carries on.
import { afterEach, describe, expect, it } from 'vitest';
import { announceHost, askJoin, chooseHostSession } from './host-guard.ts';

const stops: Array<() => void> = [];
afterEach(() => {
  for (const s of stops.splice(0)) s();
  document.body.replaceChildren();
});

/** Host A: a tab running session `code` with a kept case; `gone` counts its stops. */
function hostA(code: string) {
  const a = { gone: 0 };
  stops.push(announceHost(code, { kept: () => ({ 'pme.position': `{"code":"${code}"}` }), gone: () => void a.gone++ }));
  return a;
}
/** The prompt, answered by its button once shown. */
const answer = (label: RegExp) => async (code: string) => {
  const p = askJoin(code);
  const d = document.querySelector('dialog.host-guard') as HTMLDialogElement;
  expect(d).not.toBeNull();
  expect(d.textContent).toContain(`already running in another tab (code ${code})`);
  ([...d.querySelectorAll('button')].find((b) => label.test(b.textContent ?? '')) as HTMLButtonElement).click();
  return p;
};
const until = async (f: () => boolean) => {
  for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 10));
};

describe('second instructor tab', () => {
  it('no other host: no prompt, the page keeps its own code (null: a new one)', async () => {
    let asked = 0;
    const r = await chooseHostSession(null, async () => (asked++, 'new'));
    expect([asked, r]).toEqual([0, { code: null, kept: null }]);
  });

  it('host A live, a new tab without ?session: the prompt; "open that session" = the same code, with its case', async () => {
    const a = hostA('QFBAWA');
    let shown = 0;
    const r = await chooseHostSession(null, async (c) => (shown++, answer(/Open that tab/)(c)));
    expect(shown).toBe(1);
    expect(r).toEqual({ code: 'QFBAWA', kept: { 'pme.position': '{"code":"QFBAWA"}' } });
    await until(() => a.gone > 0);
    expect(a.gone).toBe(1); // A stopped: one host per code
  });

  it('"start a new session" = a new code; host A carries on', async () => {
    const a = hostA('QFBAWA');
    const r = await chooseHostSession(null, answer(/Start a new/));
    expect(r).toEqual({ code: null, kept: null });
    await new Promise((x) => setTimeout(x, 50));
    expect(a.gone).toBe(0);
  });

  it('a duplicated tab (same ?session) is asked; a tab of another session is not', async () => {
    hostA('QFBAWA');
    let asked = 0;
    const ask = async () => (asked++, 'new' as const);
    expect((await chooseHostSession('KXRMTP', ask)).code).toBe('KXRMTP');
    expect(asked).toBe(0);
    await chooseHostSession('QFBAWA', ask);
    expect(asked).toBe(1);
  });

  it('a tab that starts hosting a code stops the other tab hosting it', async () => {
    const a = hostA('QFBAWA');
    hostA('QFBAWA');
    await until(() => a.gone > 0);
    expect(a.gone).toBe(1);
  });
});
