// @vitest-environment happy-dom
// A follower page is the instrument its address names, and keeps that address: a reload, or a tab the browser restores,
// opens the same instrument with the same title. An address it does not know is the learner monitor's.
import { afterEach, describe, expect, it, vi } from 'vitest';

type Mounted = { code: string; show: unknown };

/** Opens main.ts at `url` as a fresh page load, with the follower's transport and devices stubbed. */
async function open(url: string): Promise<Mounted[]> {
  const calls: Mounted[] = [];
  vi.resetModules();
  vi.doMock('./views/follower.ts', async (orig) => ({
    ...(await orig<typeof import('./views/follower.ts')>()),
    mountFollower: (_s: unknown, _site: unknown, code: string, _bar: unknown, _net: unknown, o: { show: unknown }) => {
      calls.push({ code, show: o.show });
      return { monitor: { skin: null, latchAlarms: () => {}, viewerClock: () => new Promise(() => {}) }, style: { skin: 'saadat-like', theme: '' }, sync: null, transport: {}, destroy: () => {} };
    },
  }));
  vi.doMock('./views/depth.ts', async (orig) => ({ ...(await orig<typeof import('./views/depth.ts')>()), mountDepthWindow: () => ({ setTheme: () => {}, attach: () => {} }) }));
  vi.doMock('./sim-line.ts', () => ({ simLine: () => ({ set: () => {} }) }));
  vi.doMock('./fast-forward.ts', () => ({ mountFastForward: () => {} }));
  document.body.innerHTML = '<div id="app"></div>';
  delete document.documentElement.dataset.learner;
  history.replaceState(null, '', url);
  await import('./main.ts');
  return calls;
}

const shown = () => {
  const view = document.querySelector<HTMLElement>('[data-view="monitor"]');
  return { visible: view?.hidden === false, heading: view?.querySelector('h1')?.textContent, route: document.querySelector<HTMLElement>('.app')?.dataset.route };
};

afterEach(() => {
  for (const m of ['./views/follower.ts', './views/depth.ts', './sim-line.ts', './fast-forward.ts']) vi.doUnmock(m);
});

describe('a follower keeps its instrument address', () => {
  const CASES = [
    { hash: '#/monitor', show: 'learner', name: 'Learner monitor' },
    { hash: '#/monitor/wide', show: 'monitor', name: 'Patient monitor' },
    { hash: '#/defib', show: 'defib', name: 'Defibrillator' },
    { hash: '#/depth', show: 'depth', name: 'Depth of anaesthesia' },
  ];
  for (const { hash, show, name } of CASES) {
    for (const param of ['follow', 'join']) {
      it(`?${param}=CODE${hash} mounts the ${name}, titled so, at the same address, and a reload opens it again`, async () => {
        const url = `/?${param}=KKQB2N${hash}`;
        for (const load of [1, 2]) {
          expect(await open(url), `load ${load}`).toEqual([{ code: 'KKQB2N', show }]);
          expect(location.hash).toBe(hash);
          expect(document.title).toBe(`${name}: patient monitor simulator`);
          expect(shown()).toEqual({ visible: true, heading: name, route: 'monitor' });
        }
      });
    }
  }

  it('an address it does not know, or none, is the learner monitor at #/monitor', async () => {
    for (const hash of ['', '#/', '#/teach2', '#/defibrillator']) {
      expect(await open(`/?follow=KKQB2N${hash}`), hash).toEqual([{ code: 'KKQB2N', show: 'learner' }]);
      expect(location.hash).toBe('#/monitor');
      expect(document.title).toBe('Learner monitor: patient monitor simulator');
      expect(shown()).toEqual({ visible: true, heading: 'Learner monitor', route: 'monitor' });
    }
  });
});
