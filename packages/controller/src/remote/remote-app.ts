// Remote controller (R7): a phone/tablet page that joins a session code, shows the generated controls and a
// live 1 Hz readout, and never renders waveforms (samples never reach it anyway).
import { normalizeSessionCode, type ManagedTransport } from '../protocol.ts';
import { ControllerSession } from '../session/controller-session.ts';
import { renderControls } from '../panel/render-controls.ts';
import { StageBuffer } from '../panel/staging.ts';
import { injectStyles } from '../panel/styles.ts';
import type { Vocabulary } from '../vocabulary.ts';
import type { CommandInput } from '../protocol.ts';

export type Via = 'broadcastChannel' | 'websocket' | 'webrtc';

export interface RemoteOptions {
  vocabulary: Vocabulary;
  /** Build the transport for a session (the page decides URLs). */
  connect(session: string, via: Via): ManagedTransport;
  /** Offered link types, first = default. */
  vias: Via[];
  /** Pre-filled code (e.g. from ?session=). */
  session?: string;
  /** Join at once when a valid session is given. */
  autoJoin?: boolean;
}

export interface RemoteHandle {
  readonly session: ControllerSession | null;
  join(code: string, via: Via): ControllerSession;
  destroy(): void;
}

const VIA_LABEL: Record<Via, string> = { broadcastChannel: 'This browser', websocket: 'Relay (WebSocket)', webrtc: 'Direct (WebRTC)' };

export function mountRemote(parent: HTMLElement, o: RemoteOptions): RemoteHandle {
  const doc = parent.ownerDocument;
  injectStyles(doc);
  const root = doc.createElement('div');
  root.className = 'pme-remote';
  root.innerHTML = `
    <form class="pme-join pme-row">
      <input name="code" placeholder="Session code" maxlength="8" autocapitalize="characters" autocomplete="off" />
      <select name="via">${o.vias.map((v) => `<option value="${v}">${VIA_LABEL[v]}</option>`).join('')}</select>
      <button type="submit">Join</button>
      <span class="pme-status" data-ok="false">not joined</span>
    </form>
    <div class="pme-live" hidden>
      <div class="pme-vitals"><span data-v="hr">HR ---</span><span data-v="simT">t --:--</span></div>
      <div class="pme-controls-slot"></div>
      <div class="pme-stagebar" data-count="0">
        <label><input type="checkbox" name="stage" /> Stage changes</label>
        <span class="pme-staged">0 staged</span>
        <button type="button" data-action="commit">Commit</button>
        <button type="button" data-action="discard">Discard</button>
        <button type="button" data-action="pause">Pause</button>
        <button type="button" data-action="resume">Resume</button>
      </div>
      <ul class="pme-log"></ul>
    </div>`;
  parent.append(root);
  const q = <T extends Element>(sel: string) => root.querySelector(sel) as T;
  const form = q<HTMLFormElement>('form');
  const codeIn = q<HTMLInputElement>('input[name=code]');
  const viaSel = q<HTMLSelectElement>('select[name=via]');
  const status = q<HTMLElement>('.pme-status');
  if (o.session) codeIn.value = o.session;
  let session: ControllerSession | null = null;
  let off: (() => void) | null = null;

  const join = (code: string, via: Via): ControllerSession => {
    const s0 = normalizeSessionCode(code);
    if (!s0) throw new Error(`invalid session code ${code}`);
    off?.();
    session?.close();
    const s = new ControllerSession({ session: s0, transport: o.connect(s0, via), issuedBy: 'remote' });
    session = s;
    const fire = (c: CommandInput) => void s.send(c).catch(() => undefined);
    const stage = new StageBuffer(s.peerId);
    const stageBox = q<HTMLInputElement>('input[name=stage]');
    const refreshStage = () => {
      q<HTMLElement>('.pme-stagebar').dataset.count = String(stage.size);
      q<HTMLElement>('.pme-staged').textContent = `${stage.size} staged`;
    };
    const submit = (c: CommandInput, key: string) => {
      if (stageBox.checked) {
        stage.stage(c, key);
        refreshStage();
      } else fire(c);
    };
    const slot = q<HTMLElement>('.pme-controls-slot');
    slot.replaceChildren();
    const controls = renderControls(slot, o.vocabulary, { submit });
    q<HTMLElement>('.pme-live').hidden = false;
    q<HTMLElement>('.pme-stagebar').onclick = (ev) => {
      const a = (ev.target as HTMLElement).closest('button')?.dataset.action;
      if (a === 'commit') void stage.commit((c) => s.send(c)).then(refreshStage, () => undefined);
      if (a === 'discard') stage.discard();
      if (a === 'pause' || a === 'resume') fire({ type: 'time', action: a });
      refreshStage();
    };
    const render = () => {
      controls.update(s.state, s.measurements);
      const hr = s.measurements.hr;
      q<HTMLElement>('[data-v=hr]').textContent = `HR ${hr && hr.value !== null ? Math.round(hr.value) : '---'}`;
      const t = s.simT;
      q<HTMLElement>('[data-v=simT]').textContent = t === null ? 't --:--' : `t ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      const ok = s.status === 'open' && s.hostOnline;
      status.dataset.ok = String(ok);
      status.textContent = ok ? `connected · ${s0}` : s.status === 'open' ? 'waiting for host' : s.status === 'connecting' ? 'disconnected — retrying' : s.status;
      q<HTMLUListElement>('.pme-log').replaceChildren(
        ...s.log.slice(-8).reverse().map((e) => {
          const li = doc.createElement('li');
          li.dataset.kind = e.kind;
          li.textContent = `${e.kind} ${e.text}`;
          return li;
        }),
      );
    };
    off = s.onChange(render);
    render();
    return s;
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      join(codeIn.value, viaSel.value as Via);
    } catch (err) {
      status.textContent = (err as Error).message;
    }
  });
  if (o.autoJoin && o.session && normalizeSessionCode(o.session)) join(o.session, o.vias[0] as Via);

  return {
    get session() {
      return session;
    },
    join,
    destroy() {
      off?.();
      session?.close();
      root.remove();
    },
  };
}
