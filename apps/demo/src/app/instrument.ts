// Which skin an instrument wears, and what the defibrillator window reads out (Room plan R5, §4 D5). Pure: no DOM.
// The defibrillator window wears the room's defibrillator model's own look — that skin's defibrillator block is the
// model's spec (site.ts DEFIB_CHOICES, the engine's DEFIB_MODELS) — whatever the monitor style; with no model chosen it
// wears the monitor style, so its engine holds the host's own spec. The pacer's spec is the model's too (row 58, plan §9).
import type { DeviceEvent } from '@pme/engine-core';
import { DEFIB_CHOICES } from './site.ts';

type DefibStatus = NonNullable<Extract<DeviceEvent, { type: 'deviceStatus' }>['defib']>;

/** The defibrillator window's skin: the room model's look, else the monitor style. */
export const defibSkin = (model: string | null, monitorSkin: string): string => DEFIB_CHOICES.find((c) => c.id === model)?.look ?? monitorSkin;

/** The window's readout: the selected energy, then CHARGING or READY, and SYNC (the monitor header's words). */
export function defibReadout(d: Pick<DefibStatus, 'energyJ' | 'state' | 'sync'> | null | undefined): string {
  if (!d) return '';
  return `${d.energyJ} J${d.state === 'charging' ? ' CHARGING' : d.state === 'ready' ? ' READY' : ''}${d.sync ? ' SYNC' : ''}`;
}

/**
 * R5d: a refusal of the window's press, in the device's words. The engine's own reasons (defib.ts validateDefib) read as
 * the defibrillator's screen would say them; any other reason (the host's: a fast-forward, a press it did not take) is
 * shown as the host wrote it.
 */
export function defibWords(reason: string | undefined): string {
  if (reason === 'defibrillator is not charged') return 'Not charged';
  const r = reason?.trim() || 'Not taken';
  return r.charAt(0).toUpperCase() + r.slice(1);
}
