// @vitest-environment happy-dom
// MUI-17 (classroom): Home's "CPU, this app" tile averaged the last 5 s (a step in the page's load took 5 s to show);
// it now reads the last 2 s. The Memory tile showed "—" on Safari for good — Safari has no memory API — so a browser
// without `performance.memory` gets no Memory tile at all.
import { afterEach, describe, expect, it } from 'vitest';
import { CPU_WINDOW_MS, Meters } from '../meters.ts';
import { homeView } from './home.ts';

const keys = (el: HTMLElement) => [...el.querySelectorAll('.home-stat .home-k')].map((k) => k.textContent);
const perf = performance as Performance & { memory?: unknown };

describe('MUI-17: the Home tiles', () => {
  const had = Object.getOwnPropertyDescriptor(perf, 'memory');
  afterEach(() => {
    if (had) Object.defineProperty(perf, 'memory', had);
    else delete perf.memory;
  });

  it('the CPU tile reads the last 2 s, and says so', () => {
    expect(CPU_WINDOW_MS).toBe(2000);
    expect(new Meters().cpuMethod()).toContain('last 2 s');
  });

  it('a browser with no memory API (Safari) has no Memory tile', () => {
    delete perf.memory;
    expect(keys(homeView().el)).toEqual(['CPU, this app', 'Engine']);
  });

  it('a browser with one (Chrome, Edge) keeps it', () => {
    Object.defineProperty(perf, 'memory', { configurable: true, value: { usedJSHeapSize: 50 * 1048576 } });
    expect(keys(homeView().el)).toEqual(['CPU, this app', 'Memory', 'Engine']);
  });
});
