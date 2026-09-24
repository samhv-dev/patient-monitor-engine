// In-memory RTCPeerConnection/RTCDataChannel pair for Vitest (Node has no WebRTC). Offers/answers carry the
// connection's registry id as their "sdp"; when both descriptions are set the two channels open.
import type { DataChannelLike, PeerConnectionLike } from '../../src/transport/webrtc.ts';

const registry = new Map<string, FakePeerConnection>();
let nextId = 0;

class FakeDataChannel implements DataChannelLike {
  readyState = 'connecting';
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  other: FakeDataChannel | null = null;
  send(data: string): void {
    if (this.readyState !== 'open') throw new Error('channel not open');
    const o = this.other;
    setTimeout(() => o?.onmessage?.({ data }), 0);
  }
  open(): void {
    this.readyState = 'open';
    setTimeout(() => this.onopen?.(), 0);
  }
  close(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    setTimeout(() => this.onclose?.(), 0);
    this.other?.close();
  }
}

export class FakePeerConnection implements PeerConnectionLike {
  static created = 0;
  readonly id = `fake-${++nextId}`;
  connectionState = 'new';
  onicecandidate: PeerConnectionLike['onicecandidate'] = null;
  ondatachannel: PeerConnectionLike['ondatachannel'] = null;
  onconnectionstatechange: (() => void) | null = null;
  private channel: FakeDataChannel | null = null;
  private remote: FakePeerConnection | null = null;

  constructor(_config: { iceServers: RTCIceServer[] }) {
    FakePeerConnection.created++;
    registry.set(this.id, this);
  }
  createDataChannel(_label: string): DataChannelLike {
    this.channel = new FakeDataChannel();
    return this.channel;
  }
  async createOffer() {
    return { type: 'offer' as const, sdp: this.id };
  }
  async createAnswer() {
    return { type: 'answer' as const, sdp: this.id };
  }
  async setLocalDescription(): Promise<void> {
    setTimeout(() => this.onicecandidate?.({ candidate: null }), 0);
  }
  async setRemoteDescription(d: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> {
    this.remote = registry.get(d.sdp ?? '') ?? null;
    if (d.type === 'answer' && this.remote && this.channel) {
      const theirs = new FakeDataChannel();
      theirs.other = this.channel;
      this.channel.other = theirs;
      this.remote.ondatachannel?.({ channel: theirs });
      this.connectionState = this.remote.connectionState = 'connected';
      theirs.open();
      this.channel.open();
    }
  }
  async addIceCandidate(): Promise<void> {}
  close(): void {
    this.connectionState = 'closed';
    this.channel?.close();
    registry.delete(this.id);
  }
}
