// WebRTC DataChannel transport (brief §3.7): reliable and ordered (the RTCDataChannel defaults), signalled
// through the relay's /signal endpoint. Point to point: a controller or viewer (initiator) ↔ the host
// (responder, id 'host'). The host accepts any number of peers with acceptWebRtcPeers(). No STUN/TURN by
// default (LAN use, R7); pass iceServers for anything else.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';
import { DEFAULT_BACKOFF, backoffDelay, type BackoffOptions } from './backoff.ts';
import type { WebSocketCtor, WebSocketLike } from './websocket.ts';

export const HOST_SIGNAL_ID = 'host';

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit | null;
}

export interface Signaling {
  readonly selfId: string;
  send(to: string, data: SignalData): void;
  onSignal(fn: (from: string, data: SignalData) => void): () => void;
  close(): void;
}

/** Signalling over the relay's /signal endpoint (url is the relay base, e.g. ws://host:8787). */
export function createRelaySignaling(o: { url: string; session: string; peerId: string; WebSocketImpl?: WebSocketCtor }): Signaling {
  const Impl = o.WebSocketImpl ?? (WebSocket as unknown as WebSocketCtor);
  const u = new URL(o.url);
  u.pathname = '/signal';
  u.search = `?session=${encodeURIComponent(o.session)}&peer=${encodeURIComponent(o.peerId)}`;
  const fns = new Set<(from: string, d: SignalData) => void>();
  const queue: string[] = [];
  const ws: WebSocketLike = new Impl(u.toString());
  ws.onopen = () => {
    for (const q of queue.splice(0)) ws.send(q);
  };
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string') return;
    try {
      const f = JSON.parse(ev.data) as { from?: unknown; data?: unknown };
      if (typeof f.from === 'string' && f.data && typeof f.data === 'object') for (const fn of [...fns]) fn(f.from, f.data as SignalData);
    } catch {
      /* ignore malformed signalling */
    }
  };
  return {
    selfId: o.peerId,
    send(to, data) {
      const s = JSON.stringify({ to, data });
      if (ws.readyState === 1) ws.send(s);
      else queue.push(s);
    },
    onSignal(fn) {
      fns.add(fn);
      return () => {
        fns.delete(fn);
      };
    },
    close: () => ws.close(1000, 'closed'),
  };
}

/** The subset of RTCPeerConnection used here (the browser's, or a fake in tests). */
export interface PeerConnectionLike {
  connectionState: string;
  onicecandidate: ((ev: { candidate: { toJSON(): RTCIceCandidateInit } | null }) => void) | null;
  ondatachannel: ((ev: { channel: DataChannelLike }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  createDataChannel(label: string, init?: { ordered?: boolean }): DataChannelLike;
  createOffer(): Promise<{ type: 'offer'; sdp?: string }>;
  createAnswer(): Promise<{ type: 'answer'; sdp?: string }>;
  setLocalDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void>;
  setRemoteDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void>;
  addIceCandidate(c: RTCIceCandidateInit): Promise<void>;
  close(): void;
}
export interface DataChannelLike {
  readonly readyState: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}
export type PeerConnectionCtor = new (config: { iceServers: RTCIceServer[] }) => PeerConnectionLike;

export interface WebRtcOptions {
  signaling: Signaling;
  /** The other side's signalling id (HOST_SIGNAL_ID for controllers/viewers). */
  remoteId: string;
  /** true: create the channel and the offer, and reconnect with backoff. false: answer one offer. */
  initiator: boolean;
  RTCPeerConnectionImpl?: PeerConnectionCtor;
  iceServers?: RTCIceServer[];
  backoff?: BackoffOptions;
}

class RtcTransport extends TransportBase {
  readonly kind = 'webrtc' as const;
  private readonly o: WebRtcOptions;
  private readonly Impl: PeerConnectionCtor;
  private pc: PeerConnectionLike | null = null;
  private dc: DataChannelLike | null = null;
  private attempt = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private readonly offSignal: () => void;
  /** Trickled candidates that arrive before the remote description is set are held here. */
  private early: RTCIceCandidateInit[] = [];
  private remoteSet = false;

  constructor(o: WebRtcOptions, firstOffer?: SignalData) {
    super();
    this.o = o;
    this.Impl = o.RTCPeerConnectionImpl ?? (RTCPeerConnection as unknown as PeerConnectionCtor);
    this.offSignal = o.signaling.onSignal((from, d) => {
      if (from === o.remoteId) void this.onSignal(d);
    });
    this.start();
    if (firstOffer) void this.onSignal(firstOffer);
  }

  private start(): void {
    this.setStatus('connecting');
    const pc = new this.Impl({ iceServers: this.o.iceServers ?? [] });
    this.pc = pc;
    this.early = [];
    this.remoteSet = false;
    pc.onicecandidate = (ev) => {
      if (this.pc === pc) this.o.signaling.send(this.o.remoteId, { type: 'candidate', candidate: ev.candidate ? ev.candidate.toJSON() : null });
    };
    pc.onconnectionstatechange = () => {
      if (this.pc === pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) this.lost();
    };
    if (this.o.initiator) {
      this.bind(pc.createDataChannel('pme', { ordered: true }));
      void (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (this.pc === pc) this.o.signaling.send(this.o.remoteId, { type: 'offer', ...(offer.sdp !== undefined ? { sdp: offer.sdp } : {}) });
      })();
    } else {
      pc.ondatachannel = (ev) => this.bind(ev.channel);
    }
  }

  private bind(dc: DataChannelLike): void {
    this.dc = dc;
    dc.onopen = () => {
      if (this.dc !== dc) return;
      this.attempt = 0;
      this.setStatus('open');
    };
    dc.onclose = () => {
      if (this.dc === dc) this.lost();
    };
    dc.onmessage = (ev) => {
      if (this.dc !== dc || typeof ev.data !== 'string') return;
      try {
        this.deliver(JSON.parse(ev.data));
      } catch {
        this.rejected++;
      }
    };
  }

  private async onSignal(d: SignalData): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    if (d.type === 'offer' && !this.o.initiator) {
      await pc.setRemoteDescription({ type: 'offer', ...(d.sdp !== undefined ? { sdp: d.sdp } : {}) });
      await this.remoteReady(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.o.signaling.send(this.o.remoteId, { type: 'answer', ...(answer.sdp !== undefined ? { sdp: answer.sdp } : {}) });
    } else if (d.type === 'answer' && this.o.initiator) {
      await pc.setRemoteDescription({ type: 'answer', ...(d.sdp !== undefined ? { sdp: d.sdp } : {}) });
      await this.remoteReady(pc);
    } else if (d.type === 'candidate' && d.candidate) {
      if (!this.remoteSet) this.early.push(d.candidate);
      else await pc.addIceCandidate(d.candidate).catch(() => undefined);
    }
  }

  private async remoteReady(pc: PeerConnectionLike): Promise<void> {
    this.remoteSet = true;
    for (const c of this.early.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
  }

  /** The channel or connection died: the initiator retries with backoff; a responder closes for good. */
  private lost(): void {
    if (this.closed) return;
    this.dropPc();
    if (!this.o.initiator) {
      this.close();
      return;
    }
    this.setStatus('connecting');
    this.retry = setTimeout(() => {
      this.retry = null;
      if (!this.closed) this.start();
    }, backoffDelay(this.attempt++, this.o.backoff ?? DEFAULT_BACKOFF));
  }

  private dropPc(): void {
    const pc = this.pc;
    const dc = this.dc;
    this.pc = null;
    this.dc = null;
    dc?.close();
    pc?.close();
  }

  protected write(m: WireMessage): void {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(m));
  }

  /** Test hook: kill the channel as if the network failed. */
  dropForTest(): void {
    this.dc?.close();
  }

  protected teardown(): void {
    if (this.retry !== null) clearTimeout(this.retry);
    this.offSignal();
    this.dropPc();
  }
}

export type WebRtcTransport = ManagedTransport & { dropForTest(): void };

/** Initiator (controller/viewer) side, or a responder for one already-received offer (used by acceptWebRtcPeers). */
export function createWebRtcTransport(o: WebRtcOptions, firstOffer?: SignalData): WebRtcTransport {
  return new RtcTransport(o, firstOffer);
}

/**
 * Host side: answer every incoming offer with a new responder transport. A second offer from the same peer
 * (it reconnected) replaces its old transport. Returns a stop function.
 */
export function acceptWebRtcPeers(o: {
  signaling: Signaling;
  onTransport: (t: ManagedTransport, peerId: string) => void;
  RTCPeerConnectionImpl?: PeerConnectionCtor;
  iceServers?: RTCIceServer[];
}): () => void {
  const byPeer = new Map<string, WebRtcTransport>();
  const off = o.signaling.onSignal((from, d) => {
    if (d.type !== 'offer') return;
    byPeer.get(from)?.close();
    const t = createWebRtcTransport(
      {
        signaling: o.signaling,
        remoteId: from,
        initiator: false,
        ...(o.RTCPeerConnectionImpl ? { RTCPeerConnectionImpl: o.RTCPeerConnectionImpl } : {}),
        ...(o.iceServers ? { iceServers: o.iceServers } : {}),
      },
      d,
    );
    byPeer.set(from, t);
    o.onTransport(t, from);
  });
  return () => {
    off();
    for (const t of byPeer.values()) t.close();
    byPeer.clear();
  };
}
