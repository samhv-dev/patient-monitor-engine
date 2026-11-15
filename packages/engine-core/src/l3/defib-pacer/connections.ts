// The ZOLL M2's patient connections (docs/plans/defibrillator-zoll-m2.md §3.1 C2, piece E2a): what is attached to the
// device and the patient behind E0's `device defib connect`, and the device's documented consequences: which messages
// show, which shocks and which pacing are refused, what the paddle and internal-handle buttons do. Pages are the
// guide's printed pages, [G n-m] (ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C). The state lives in
// M2State.connections and M2State.held (E0's fields); this module only reads and changes them. A rule the guide does
// not state is a marked choice ([ENG: device; choice …]).
import type { M2Connections, M2ShockButton } from '../../types-device.ts';
import type { M2State } from './m2-vocabulary.ts';

/** The device's words, as the guide prints them. */
export const MSG = {
  /** The MFC is not connected to the unit [G 12-10], [G 6-13], [G 16-10], [G C-3]. */
  connectTherapyCable: 'Connect Therapy Cable',
  /** Pads not connected to the patient or not making good contact [G 14-9], [G 12-3], [G 16-10], [G C-2]. */
  attachPads: 'Attach Pads',
  /** Pads shorted: the test plug on the MFC [G 12-11], [G 18-4], [G 16-10], [G C-2] (a hyphen in the guide). */
  padsShorted: 'Check Pads - Pads Shorted',
  /** Paddles connected and in an open condition [G 6-13], [G 18-6]. */
  applyPaddles: 'Apply Paddles to Patient',
  /** Paddles connected in Pacer mode [G 16-10]. */
  usePadsToPace: 'Use Pads to Pace',
  /** The paddle SHOCK buttons depressed while charging [G 14-5]. */
  releaseShock: 'Release Shock Button',
  /** The internal handles' Discharge button pressed before charging [G 14-19]. */
  notReady: 'Defib Not Ready - Press Charge',
  /** A cable lead is the top trace and the cable or a lead is off [G 6-8], [G 6-13], [G C-4]. */
  ecgLeadOff: 'ECG Lead Off',
} as const;
export type M2Message = (typeof MSG)[keyof typeof MSG];

/** Internal handles: connecting them sets 10 J [G 14-18]. */
export const INTERNAL_START_J = 10;
/** Internal handles: 50 J is the maximum energy selection [G 14-18]. */
export const INTERNAL_MAX_J = 50;
export const INTERNAL_MAX_REASON = `${INTERNAL_MAX_J} J is the maximum energy with internal paddles`;
/** The front panel SHOCK with paddles or handles that have their own buttons [G 2-4], [G 14-7]. */
export const PANEL_INACTIVE = 'the front panel SHOCK button is inactive with paddles that have SHOCK buttons (press both paddle SHOCK buttons)';
const HANDLES_INACTIVE = 'the front panel SHOCK button is inactive with internal handles that have a Discharge button (press the Discharge button)';
/** Internal handles off the heart: an open circuit, outside the 7–300 Ω window [G A-2]. The guide prints no message
 * for it [ENG: device; choice, the refusal's words]. */
const HANDLES_OPEN = 'internal paddles are not in contact with the heart';

/** What the MFC carries, as the device sees it: nothing when the MFC itself is not plugged in [G 2-7], [G 2-9]. */
export function therapyOf(c: M2Connections): M2Connections['therapy'] {
  return c.mfc ? c.therapy : 'none';
}

/**
 * Why no energy can reach the patient through what is connected, as the device's words, or undefined. Pads not in
 * good contact: "Attach Pads", no energy delivered [G 14-9], [G 12-3] ('poor' is read as "not making good contact").
 * Shorted: treatment refused until corrected [G 12-11]. No MFC [G 12-10]. Paddles or handles in an open condition: an
 * open circuit, outside the 15–300 Ω (paddles) or 7–300 Ω (internal) window [G A-2]. Paddles in poor contact are
 * not refused here: their impedance is E2b's (the guide prints no message for it).
 */
export function shockBlock(c: M2Connections): string | undefined {
  if (!c.mfc) return MSG.connectTherapyCable;
  switch (c.therapy) {
    case 'none':
      return MSG.attachPads; // the MFC with nothing on its patient end [G 18-6, step 3]
    case 'pads':
      return c.pads.contact === 'good' ? undefined : MSG.attachPads;
    case 'testPlug':
      return MSG.padsShorted; // the 30 J self-test through it is E9b's
    case 'externalPaddles':
      return c.paddles.contact === 'off' ? MSG.applyPaddles : undefined;
    case 'internalHandles':
      return c.internal.contact === 'off' ? HANDLES_OPEN : undefined;
  }
}

/** The front panel SHOCK is active only with pads, or with paddles or handles without their own button [G 2-4],
 * [G 14-7], [G 14-19, step 6]. The reason it is not, or undefined. */
export function panelShockReason(c: M2Connections): string | undefined {
  const t = therapyOf(c);
  if (t === 'externalPaddles' && c.paddles.shockButtons) return PANEL_INACTIVE;
  if (t === 'internalHandles' && c.internal.dischargeButton) return HANDLES_INACTIVE;
  return undefined;
}

/** The refusal of a shock from the panel (today `applyEvent defib shock`): the panel rule, then the path. */
export function panelShockRefusal(c: M2Connections): string | undefined {
  return panelShockReason(c) ?? shockBlock(c);
}

/** Paddles and internal handles cannot pace [G 2-10], [G 16-10]. */
export function pacingRefusal(c: M2Connections): string | undefined {
  const t = therapyOf(c);
  return t === 'externalPaddles' || t === 'internalHandles' ? MSG.usePadsToPace : undefined;
}

/**
 * Whether the pacer's current reaches the patient: only through pads on the patient. Pads off, the test plug (the
 * output short-circuited [G 16-10]), no MFC, or paddles: the device goes on pulsing across its contacts [G 16-2], but
 * not into the patient, so there is no spike and no capture. Pads in poor contact still pace, their threshold
 * unchanged [ENG: device; choice, the threshold's dependence on contact is a gap (plan §3.3, M0b; E6)].
 */
export function pacingReachesPatient(c: M2Connections): boolean {
  return therapyOf(c) === 'pads' && c.pads.contact !== 'off';
}

/** Energy above the internal handles' maximum [G 14-18], or undefined. */
export function energyCapReason(c: M2Connections, energyJ: number): string | undefined {
  return therapyOf(c) === 'internalHandles' && energyJ > INTERNAL_MAX_J ? INTERNAL_MAX_REASON : undefined;
}

/**
 * Apply a `connect` patch (validated by E0: each part given whole). Buttons that are no longer connected are no longer
 * held. Returns true when internal handles have just become connected, so the device selects INTERNAL_START_J
 * [G 14-18] ("when an internal handle set is connected").
 */
export function applyConnect(m: M2State, patch: Partial<M2Connections>): boolean {
  const before = therapyOf(m.connections);
  Object.assign(m.connections, structuredClone(patch));
  const c = m.connections;
  if (!buttonLive(c, 'apex')) m.held.apex = m.held.sternum = false;
  if (!buttonLive(c, 'internal')) m.held.internal = false;
  return therapyOf(c) === 'internalHandles' && before !== 'internalHandles';
}

/** A paddle or handle button that exists on what is connected: the external paddles' two SHOCK buttons [G 2-12],
 * the internal handles' Discharge button [G 14-19]. The panel is E1's. */
function buttonLive(c: M2Connections, b: M2ShockButton): boolean {
  const t = therapyOf(c);
  if (b === 'apex' || b === 'sternum') return t === 'externalPaddles' && c.paddles.shockButtons;
  if (b === 'internal') return t === 'internalHandles' && c.internal.dischargeButton;
  return false;
}

/**
 * A paddle or handle button press or release. Returns 'shock' when the device must discharge now (the caller runs the
 * defibrillator's shock: in Sync it arms for the next R), 'cancel' when a held press that armed a synchronised shock is
 * released before its R ("press and hold … until energy is delivered" [G 14-18]), null otherwise.
 *
 * External paddles discharge only with BOTH SHOCK buttons held; one alone does not [G 14-7], [G 18-7, steps 14–16].
 * The internal Discharge button discharges alone [G 14-19, step 6]. The release rule: a discharge happens only on a
 * press made while the device is ready, so a press held from before (the "Release Shock Button" condition while
 * charging [G 14-5]) does not discharge at ready; the buttons are released and pressed again [ENG: device; choice, the
 * guide gives the message, not what a held press does at ready]. The panel button is E1's (plan D10).
 */
export function pressButton(m: M2State, b: M2ShockButton, phase: 'down' | 'up', ready: boolean): 'shock' | 'cancel' | null {
  if (!buttonLive(m.connections, b)) return null;
  const k = b as 'apex' | 'sternum' | 'internal';
  if (phase === 'up') {
    const was = m.held[k];
    m.held[k] = false;
    return was ? 'cancel' : null;
  }
  m.held[k] = true;
  if (!ready) return null;
  if (k === 'internal') return 'shock';
  return m.held.apex && m.held.sternum ? 'shock' : null;
}

// --- messages ------------------------------------------------------------------------------------------------------
export type M2Mode = 'off' | 'monitor' | 'manual' | 'aed' | 'pacer';
/** The M2's operating mode for its messages: the selector [G 2-4], the Manual/AED mode [G 12-2]; a running pacer is
 * Pacer mode until E1 couples the selector to it [ENG: device; choice until E1]. */
export function m2Mode(m: M2State, pacer: { mode: 'off' | 'demand' | 'fixed' }): M2Mode {
  const s = m.power.selector;
  if (s === 'off') return 'off';
  if (s === 'pacer' || pacer.mode !== 'off') return 'pacer';
  if (s === 'monitor') return 'monitor';
  return m.defibMode;
}

export type M2Priority = 'high' | 'medium' | 'low' | 'info';
const RANK: Record<M2Priority, number> = { high: 3, medium: 2, low: 1, info: 0 };
/** A message's equipment-alarm priority from appendix C, or 'info' for one appendix C does not list as an alarm. */
export function messagePriority(text: string, mode: M2Mode, pacer: { mode: 'off' | 'demand' | 'fixed'; mA: number }): M2Priority {
  switch (text) {
    case MSG.connectTherapyCable:
      return 'high'; // [G C-3]
    case MSG.attachPads:
      return 'medium'; // [G C-2]
    case MSG.padsShorted:
      // Medium in Defib, Low in Monitor [G C-2]; Pacer is not given: medium, as it raises an alarm there [G 16-2]
      // [ENG: device; choice]
      return mode === 'monitor' ? 'low' : 'medium';
    case MSG.ecgLeadOff:
      return pacer.mode === 'demand' && pacer.mA > 0 ? 'high' : 'medium'; // [G C-4]
    default:
      return 'info';
  }
}

/**
 * The connection messages showing now, the most important first (appendix C's priorities; equal priorities in this
 * order). The pads messages show in Monitor and Manual Defib only while Pads/Paddles is the top trace [G C-2], [G C-3],
 * [G 6-8]; in AED [G 12-10] and Pacer [G 16-2], [G 16-10] always. Device off: none. Other pieces' messages (AED, CPR,
 * pacer, faults) join this list when they land (E5, E6, E7c).
 */
export function connectionMessages(m: M2State, defibState: 'idle' | 'charging' | 'ready', pacer: { mode: 'off' | 'demand' | 'fixed'; mA: number }): string[] {
  const mode = m2Mode(m, pacer);
  if (mode === 'off') return [];
  const c = m.connections;
  const out: string[] = [];
  const padsTop = m.topLead === 'pads';
  if (mode === 'aed' || mode === 'pacer' || padsTop) {
    const t = therapyOf(c);
    if (mode === 'pacer' && (t === 'externalPaddles' || t === 'internalHandles')) out.push(MSG.usePadsToPace);
    else {
      const why = shockBlock(c);
      // the internal handles' open condition has no message in the guide
      if (why === MSG.connectTherapyCable || why === MSG.attachPads || why === MSG.padsShorted || why === MSG.applyPaddles) out.push(why);
    }
  }
  if (!padsTop && (c.ecgCable === 'none' || c.ecgLeadsOff)) out.push(MSG.ecgLeadOff);
  if (defibState === 'charging' && (m.held.apex || m.held.sternum)) out.push(MSG.releaseShock);
  if (defibState === 'idle' && m.held.internal) out.push(MSG.notReady);
  return out.map((text, i) => ({ text, i, r: RANK[messagePriority(text, mode, pacer)] })).sort((a, b) => b.r - a.r || a.i - b.i).map((x) => x.text);
}

/** The connection, held-button and message fields as primitives, for the device layer's change compare (no string or
 * object built: it runs every tick), so the status goes out at once when one changes. */
export function connectionKey(m: M2State): Array<string | boolean | number> {
  const c = m.connections;
  const h = m.held;
  return [
    c.mfc, c.therapy, c.pads.type, c.pads.placement, c.pads.contact, c.paddles.pediPlates, c.paddles.shockButtons, c.paddles.contact,
    c.internal.dischargeButton, c.internal.contact, c.ecgCable, c.ecgLeadsOff, c.spo2, c.nibp, c.co2, c.temp1, c.temp2,
    h.panel, h.apex, h.sternum, h.internal, m.messages.length, ...m.messages,
  ];
}
