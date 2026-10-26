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

// UI review #27: the sensor toggles read the sensors the engine reports (the state the monitor draws from), not the
// free-play default: the MH and haemorrhage cards attach the CO₂ line and the arterial line, and the list said they
// were not attached while the monitor showed a capnogram and ART.
describe('Devices & alarms: the sensors as the monitor has them (UI review #27)', () => {
  beforeEach(() => document.body.replaceChildren());
  const pressed = (el: HTMLElement) => Object.fromEntries([...el.querySelectorAll('.toggles button')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]));

  it('a card with the CO₂ line and the arterial line: both shown attached, an unused line not', () => {
    const { link } = fakeLink('saadat-like');
    (link.ctl as unknown as { state: unknown }).state = { sensors: { ecg: 'on', spo2: 'on', nibp: 'on', abp: 'connected', cvp: 'none', pap: 'none', co2: 'on', temp: 'on' } };
    let refresh = () => undefined as void;
    const el = devicesTab({ link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx);
    document.body.append(el);
    refresh();
    expect(pressed(el)).toMatchObject({ 'ECG leads': 'true', 'CO₂ sampling line': 'true', 'Arterial line': 'true', 'CVP line': 'false', 'PA catheter': 'false', 'NIBP cuff': 'true' });
    // the engine detaches the line: the toggle follows at the next repaint
    (link.ctl as unknown as { state: { sensors: Record<string, string> } }).state.sensors.co2 = 'off';
    refresh();
    expect(pressed(el)['CO₂ sampling line']).toBe('false');
    // pressed: it stays pressed through a repaint before the engine's next state reports the line attached
    ([...el.querySelectorAll('.toggles button')].find((b) => b.textContent === 'CO₂ sampling line') as HTMLButtonElement).click();
    refresh();
    expect(pressed(el)['CO₂ sampling line']).toBe('true');
  });
});

// UI review #28: the list read "No active alarms" for the first ≈ 0.5 s after the tab opened while the bar showed
// "!!! ART M low +4": the tab painted at the next throttled repaint, so it showed what it had when last open. It now
// paints as it opens.
describe('Devices & alarms: the list reads the bar’s alarms as the tab opens (UI review #28)', () => {
  beforeEach(() => document.body.replaceChildren());
  it('opened from another tab, the list shows the active alarms at once', () => {
    const { link } = fakeLink('saadat-like');
    const p = mountPanel(link, { site: {} as never, weightKg: () => 70, tab: 'devices' });
    document.body.append(p.el);
    p.select('airway');
    const a = link.alarms as unknown as { active: unknown[] };
    a.active = [
      { id: 'ART_M_LOW', level: 1, text: 'ART M TOO LOW', since: 500, acked: false, latched: false },
      { id: 'HR_HIGH', level: 1, text: 'HR TOO HIGH', since: 520, acked: false, latched: false },
    ];
    p.select('devices'); // no repaint has run since
    const items = [...p.el.querySelectorAll('ul.alarms li')].map((li) => li.textContent ?? '');
    expect(items).toHaveLength(2);
    expect(items.join(' ')).not.toContain('No active alarms');
    p.destroy();
  });

  it('the status says the monitor’s alarm sound is on but this window is muted, as the top bar’s "Sound off" says', () => {
    const { link } = fakeLink('saadat-like');
    (link as unknown as { host: unknown }).host = { spec: { attached: true }, soundOn: false };
    let refresh = () => undefined as void;
    const el = devicesTab({ link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx);
    refresh();
    expect(el.querySelector('[role=status]')?.textContent).toBe('Alarm sound on at the monitor; this window is muted (Sound off, top right)');
    (link.host as unknown as { soundOn: boolean }).soundOn = true;
    refresh();
    expect(el.querySelector('[role=status]')?.textContent).toBe('Alarm sound on');
  });
});
