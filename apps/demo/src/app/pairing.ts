// How the host offers a Remote (review F2; orchestrator ruling 6). Version 1.0 pairs a Remote in the SAME browser only:
// the default transport is a BroadcastChannel, which never leaves the browser profile. A tablet on the network needs
// the Stage 6a relay (?relay=ws://…) and a network address the tablet can reach; that path is a version 1.1 feature,
// so without a relay the host shows no QR code and says so. No DOM here: the host view and its test read the result.

export interface PairingLocation {
  origin: string;
  hostname: string;
  pathname: string;
  search: string;
}

export interface Pairing {
  /** The address a Remote opens: this page at #/remote with the code (and the relay, when one is configured). */
  url: string;
  relay: string | null;
  /** Show the QR code: only with a relay and an address another device can reach. */
  qr: boolean;
  /** One sentence for the host, in plain words. */
  note: string;
}

/** Loopback hosts: an address on them works on this computer only. */
const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

export function pairingUrl(code: string, loc: PairingLocation): string {
  const relay = new URLSearchParams(loc.search).get('relay');
  return `${loc.origin}${loc.pathname}${relay ? `?relay=${encodeURIComponent(relay)}` : ''}#/remote?code=${code}`;
}

export function pairingOf(code: string, loc: PairingLocation): Pairing {
  const relay = new URLSearchParams(loc.search).get('relay');
  const url = pairingUrl(code, loc);
  if (!relay) {
    return {
      url, relay: null, qr: false,
      note: 'In this version the remote works in this browser only: open it in a new window or tab on this computer. Pairing a tablet over the network needs the relay server and comes in version 1.1.',
    };
  }
  if (LOOPBACK.test(loc.hostname)) {
    return {
      url, relay, qr: false,
      note: 'This address works on this computer only. Open the app by its network address (for example http://192.168.1.20:5173/?relay=…) so a tablet can reach it.',
    };
  }
  return { url, relay, qr: true, note: 'Network pairing through the relay is a preview of version 1.1. Scan the code with a tablet on the same network.' };
}
