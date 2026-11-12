// Plan pump-rack-tci.md A2: what the channel flows share — the shape of a flow, what it is given, and the small form
// helpers every flow's fields are made with (each field labelled, each read by its name). No flow logic lives here.
import type { Formulary, PumpDevices, PumpLabels, WireMessage } from '@pme/controller';
import { h } from '../ui.ts';
import type { FaceRow } from './face-row.ts';
import type { ChannelKind } from './face.ts';

/** One command of the pump's allow-list (C1's PUMP_COMMANDS), as a flow builds it; the follower stamps id and issuedBy. */
export type PumpBody = { type: 'pump'; ch: number; action: string } & Record<string, unknown>;
/** A preparation's label as the host sends it to the pump tablets (C2 `labels`): never its findings or true contents. */
export type PumpLabel = PumpLabels['labels'][number];
/** The case patient's demographics, as the case sheet gives them (D6's "Copy from the case sheet"). */
export interface CasePatient {
  ageY: number;
  weightKg: number;
  heightCm: number;
  sex: 'm' | 'f';
}

/** What the flows need of the tablet's follower. */
export interface PumpLink {
  /** The follower's peer id: the host's `prep` news for this tablet is addressed to it. */
  readonly peerId: string;
  /** This tablet's device key: the history says "this tablet" for its own rows. */
  readonly device: string;
  /** Send one command under the follower's peer; returns its id, which the host's ack names. */
  command(body: PumpBody): string;
  onMessage(fn: (m: WireMessage) => void): () => void;
  /** The case patient (the follower engine's snapshot holds the case's patient), or null. */
  casePatient(): Promise<CasePatient | null>;
}

/** What a flow is given to build its form: the channel as the face shows it and the tablet's lookups. */
export interface FlowInput {
  ch: number;
  kind: ChannelKind;
  /** The channel's row, the PROGRAMME only (face-row.ts); null: the engine holds nothing on it. */
  row: FaceRow | null;
  devices: PumpDevices | null;
  formulary: Formulary | null;
  labels: readonly PumpLabel[];
  casePatient(): Promise<CasePatient | null>;
}
/** A flow's form: its fields, and the command they make, or what is missing in the face's words. */
export interface Flow {
  readonly el: HTMLElement;
  build(): PumpBody | { why: string };
}
/** A flow as the controls list it: its button, its form's title and submit word, and what an acknowledged one did. */
export interface FlowDef {
  id: 'load' | 'program' | 'rate' | 'tci' | 'bolus' | 'purge';
  button: string;
  title: string;
  submit: string;
  /** What an acknowledged one did; `row`: the channel as it was when sent. */
  done(ch: number, row: FaceRow | null): string;
  kinds: readonly ChannelKind[];
  make(x: FlowInput): Flow;
}

/** The controls' own words. */
export const FLOW_WORDS = {
  actions: 'Channel controls',
  start: 'Start',
  stop: 'Stop',
  unload: 'Unload',
  cancel: 'Cancel',
  sent: "Sent: waiting for the instructor's computer…",
  refused: (why: string) => `Refused by the instructor's computer: ${why}`,
  started: (ch: number) => `Started on channel ${ch}.`,
  stopped: (ch: number) => `Stopped on channel ${ch}.`,
  unloaded: (ch: number) => `Unloaded from channel ${ch}.`,
  missing: (what: string) => `Enter ${what} first.`,
  noProfile: 'device profile not loaded',
};

/** The words for a field the face has not got: "Enter the weight first." */
export const missing = (what: string): { why: string } => ({ why: FLOW_WORDS.missing(what) });
/** A typed number, or null (empty or not a finite number). */
export function num(v: string): number | null {
  if (v.trim() === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
/** A labelled field with a `name` (the flows' fields are read by name; every one has its label, for a screen reader). */
let nField = 0;
export function field(label: string, control: HTMLInputElement | HTMLSelectElement): HTMLElement {
  control.id ||= `pf-f${++nField}`;
  control.classList.add('input');
  return h('div', { class: 'field pf-field-in' }, h('label', { for: control.id }, label), control);
}
export const numberInput = (name: string, attrs: Record<string, string | number> = {}): HTMLInputElement =>
  h('input', { type: 'number', inputmode: 'decimal', name, step: 'any', ...attrs });
export function selectOf(name: string, options: ReadonlyArray<readonly [string, string]>, value?: string): HTMLSelectElement {
  const sel = h('select', { name });
  for (const [v, t] of options) sel.append(h('option', { value: v }, t));
  if (value !== undefined) sel.value = value;
  return sel;
}
/** A line under a form: a range or gap from the device profile, or what the paper studied (the face's words). */
export const hint = (text: string): HTMLElement => h('p', { class: 'pf-hint small' }, text);

/** "JMS SP-500" (the profile's own maker and model). */
export const deviceName = (d: { maker: string; model: string }): string => `${d.maker} ${d.model}`;

