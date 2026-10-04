import { describe, expect, it } from 'vitest';
import { pairingOf, pairingUrl } from './pairing.ts';

const at = (href: string) => {
  const u = new URL(href);
  return { origin: u.origin, hostname: u.hostname, pathname: u.pathname, search: u.search };
};

describe('remote pairing (review F2, ruling 6)', () => {
  it('without a relay: same browser only, no QR code', () => {
    const p = pairingOf('AGD5YJ', at('http://127.0.0.1:5173/'));
    expect(p).toMatchObject({ url: 'http://127.0.0.1:5173/#/remote?code=AGD5YJ', relay: null, qr: false });
    expect(p.note).toMatch(/this browser only/);
    expect(pairingOf('AGD5YJ', at('http://192.168.1.20:5173/')).qr).toBe(false); // a LAN address alone is not enough
  });
  it('with a relay: the QR code only on an address another device can reach', () => {
    const lan = pairingOf('AGD5YJ', at('http://192.168.1.20:5173/?relay=ws://192.168.1.20:8787'));
    expect(lan.qr).toBe(true);
    expect(lan.url).toBe('http://192.168.1.20:5173/?relay=ws%3A%2F%2F192.168.1.20%3A8787#/remote?code=AGD5YJ');
    for (const host of ['localhost', '127.0.0.1']) {
      const p = pairingOf('AGD5YJ', at(`http://${host}:5173/?relay=ws://localhost:8787`));
      expect(p.qr, host).toBe(false);
      expect(p.note).toMatch(/this computer only/);
    }
    expect(pairingUrl('X8N9HH', at('http://10.0.0.5/app/'))).toBe('http://10.0.0.5/app/#/remote?code=X8N9HH');
  });
});
