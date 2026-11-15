// Plan pump-rack-tci.md A2, Purge (§4 D7, §5): prime the line, or push the line's volume. Before the channel has
// delivered anything the purge moves volume from the syringe or bag to waste; once it has delivered the line is
// connected and a purge goes into the patient — the engine decides which (E1); the form says which applies from the
// channel's own infused volume, which the face shows. It runs at the device's rate from its profile: the syringe size's
// rapid rate on a syringe channel, the OT-701's "more than 450 mL/h" (the stated floor) on a drip channel. The purge
// volume limit is in neither catalogue: until the manuals are read this face accepts at most 2 mL (D7: "the face accepts
// at most 2 mL, ENG: ui, stated as 'limit not set from the manual'") and says so; nothing else is checked here.
import type { PumpDevices } from '@pme/controller';
import { h } from '../ui.ts';
import type { FaceRow } from './face-row.ts';
import type { ChannelKind } from './face.ts';
import { deviceName, field, FLOW_WORDS, hint, missing, num, numberInput, type FlowDef, type FlowInput } from './form.ts';
import { listText } from './rate.ts';

/** D7: the most this face purges at once [ENG: ui; plan D7, until the operator manuals give the purge volume limit]. */
export const PURGE_MAX_ML = 2;

export const PURGE_WORDS = {
  button: 'Purge',
  title: 'Purge',
  submit: 'Purge',
  done: (ch: number) => `Purge started on channel ${ch}.`,
  volume: 'Volume (mL)',
  theVolume: 'the volume',
  limit: `at most ${PURGE_MAX_ML} mL on this face: purge limit not set from the manual`,
  tooMuch: `At most ${PURGE_MAX_ML} mL on this face: purge limit not set from the manual.`,
  syringe: (dev: string, approx: boolean, rate: number, ml: number) => `${dev}: at ${approx ? 'about ' : ''}${rate} mL/h with a ${ml} mL syringe`,
  bySyringe: (dev: string, sizes: string) => `${dev}: the purge rate depends on the syringe (${sizes} mL): load one first`,
  drip: (dev: string, rate: number) => `${dev}: at more than ${rate} mL/h`,
  toWaste: 'Nothing delivered yet: the purge primes the line, to waste',
  toPatient: 'The line is connected: a purge now goes into the patient',
};

/** The purge's rate from the device profile, the face's limit, and where the volume goes (D7). */
export function purgeHints(kind: ChannelKind, row: FaceRow | null, devices: PumpDevices | null): string[] {
  let rate: string;
  if (!devices) rate = FLOW_WORDS.noProfile;
  else if (kind === 'drip') rate = PURGE_WORDS.drip(deviceName(devices['ot-701']), devices['ot-701'].purge.rateMoreThan);
  else {
    const sp = devices['sp-500'];
    const s = sp.syringes.find((x) => x.ml === row?.syringeMl);
    rate = s ? PURGE_WORDS.syringe(deviceName(sp), s.rapid.approx, s.rapid.rate, s.ml) : PURGE_WORDS.bySyringe(deviceName(sp), listText(sp.syringes.map((x) => x.ml)));
  }
  const out = [`${rate}; ${PURGE_WORDS.limit}`];
  if (row && row.state !== 'notLoaded') out.push(row.infusedMl > 0 ? PURGE_WORDS.toPatient : PURGE_WORDS.toWaste);
  return out;
}

function purgeFlow(x: FlowInput) {
  const volume = numberInput('volumeMl', { min: 0, max: PURGE_MAX_ML });
  const el = h('div', { class: 'pf-fields-in' }, field(PURGE_WORDS.volume, volume), ...purgeHints(x.kind, x.row, x.devices).map(hint));
  return {
    el,
    build() {
      const v = num(volume.value);
      if (v === null) return missing(PURGE_WORDS.theVolume);
      if (v > PURGE_MAX_ML) return { why: PURGE_WORDS.tooMuch };
      return { type: 'pump' as const, ch: x.ch, action: 'purge', volumeMl: v };
    },
  };
}

export const PURGE: FlowDef = { id: 'purge', button: PURGE_WORDS.button, title: PURGE_WORDS.title, submit: PURGE_WORDS.submit, done: PURGE_WORDS.done, kinds: ['syringe', 'drip'], make: purgeFlow };
