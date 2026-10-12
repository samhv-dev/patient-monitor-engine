// @vitest-environment happy-dom
// FX-4: the alarm controls follow the active skin's real capabilities. The Saadat-like monitor has no alarm pause (its
// manual: the Audio Pause key has "currently no function", research/06 §3 [M p.12–13]); the panel showed "Pause
// alarms" anyway, the engine refused it, and the keyboard shortcut's refusal was silent. Now the control is shown
// disabled with the reason in clinical words, and every refusal of an alarm action is a toast with its reason.
import { beforeEach, describe, expect, it } from 'vitest';
import type { AckResult, CommandInput } from '@pme/controller';
import type { Link } from '../link.ts';
import type { PanelCtx } from './ctx.ts';
import { devicesTab } from './devices.ts';
import { mountPanel } from './panel.ts';

const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
const NO_PAUSE: AckResult = { accepted: false, reason: 'alarm pause has no function on saadat-like', tick: 0, commandId: 'c1', rttMs: 0 };

function fakeLink(skin: string | null, reply: AckResult = OK) {
  const sent: CommandInput[] = [];
  const link = {
    alarms: skin ? { type: 'alarmStatus', t: 0, skin, ageBand: 'adult', active: [], silencedUntil: null, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: true, volume: 5 } : null,
    host: null,
    simT: 0,
    ctl: { simT: 0, scenario: { doc: null }, bookmarks: [] },
    send: async (c: CommandInput) => (sent.push(c), reply),
    onChange: () => () => undefined,
  } as unknown as Link & { alarms: { skin: string } | null };
  return { link, sent };
}

function rig(skin: string | null, reply: AckResult = OK) {
  const { link, sent } = fakeLink(skin, reply);
  let refresh = () => undefined as void;
  const ctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
  const el = devicesTab(ctx);
  document.body.append(el);
  refresh();
  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === name) as HTMLButtonElement;
  return { link, el, sent, refresh: () => refresh(), btn };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);
const reasonOf = (b: HTMLElement) => document.getElementById(b.getAttribute('aria-describedby') ?? '');
const REASON = 'This monitor has no alarm pause. Silence mutes for 120 s.';

describe('Devices & alarms: the alarm controls follow the skin', () => {
  beforeEach(() => document.body.replaceChildren());

  for (const skin of ['saadat-like', 'iran-icu-as-found']) {
    it(`${skin}: "Pause alarms" is shown disabled, with the reason visible and announced, and sends nothing`, async () => {
      const { btn, sent } = rig(skin);
      const pause = btn('Pause alarms');
      expect(pause).toBeTruthy(); // shown, never hidden silently
      expect(pause.disabled).toBe(true);
      const why = reasonOf(pause);
      expect(why?.textContent).toBe(REASON);
      expect(why?.hidden).toBe(false);
      pause.click();
      await settle();
      expect(sent).toEqual([]);
      expect(btn('Silence').disabled).toBe(false);
    });
  }

  for (const skin of ['philips-like', 'mindray-like', 'zoll-like', 'ge-like', 'lifepak-like']) {
    it(`${skin}: "Pause alarms" is enabled and sends the pause, no reason shown`, async () => {
      const { btn, sent } = rig(skin);
      const pause = btn('Pause alarms');
      expect(pause.disabled).toBe(false);
      expect(reasonOf(pause)?.hidden ?? true).toBe(true);
      pause.click();
      await settle();
      expect(sent).toEqual([{ type: 'device', action: { device: 'alarm', action: 'pause' } }]);
    });
  }

  it('the skin changes: the control follows at the next repaint', () => {
    const { link, btn, refresh } = rig('philips-like');
    expect(btn('Pause alarms').disabled).toBe(false);
    (link.alarms as { skin: string }).skin = 'saadat-like';
    refresh();
    expect(btn('Pause alarms').disabled).toBe(true);
    (link.alarms as { skin: string }).skin = 'mindray-like';
    refresh();
    expect(btn('Pause alarms').disabled).toBe(false);
  });

  it('a Remote that has not heard the skin yet leaves the control enabled (the engine decides)', () => {
    const { btn } = rig(null);
    expect(btn('Pause alarms').disabled).toBe(false);
  });

  it('a refusal from the engine is a toast with its reason in clinical words, no skin id', async () => {
    // drawn for a monitor with a pause; the skin changes before the next repaint; the engine refuses the press
    const { link, btn } = rig('philips-like', NO_PAUSE);
    (link.alarms as { skin: string }).skin = 'saadat-like';
    btn('Pause alarms').click();
    await settle();
    expect(toasts()).toEqual([`Not done: ${REASON}`]);
  });

  it('any other refused alarm action: the toast keeps the engine reason, the skin id in words', async () => {
    const { btn } = rig('zoll-like', { ...NO_PAUSE, reason: 'no alarm limit HR on zoll-like' });
    btn('Acknowledge').click();
    await settle();
    expect(toasts()).toEqual(['Not done: no alarm limit HR on this monitor']);
  });
});

describe('keyboard shortcut Shift+P', () => {
  beforeEach(() => document.body.replaceChildren());

  it('refused on a monitor without a pause: a toast with the reason (it was silent)', async () => {
    const { link, sent } = fakeLink('saadat-like', NO_PAUSE);
    const p = mountPanel(link, { site: {} as never, weightKg: () => 70, tab: 'devices' });
    document.body.append(p.el);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', shiftKey: true, bubbles: true }));
    await settle();
    expect(sent.length).toBe(1);
    expect(toasts()).toEqual([`Not done: ${REASON}`]);
    p.destroy();
  });

  it('accepted: "Alarms paused" as before', async () => {
    const { link } = fakeLink('philips-like', OK);
    const p = mountPanel(link, { site: {} as never, weightKg: () => 70, tab: 'devices' });
    document.body.append(p.el);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', shiftKey: true, bubbles: true }));
    await settle();
    expect(toasts()).toEqual(['Alarms paused']);
    p.destroy();
  });
});
