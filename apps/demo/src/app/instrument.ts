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
