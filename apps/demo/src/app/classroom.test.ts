// The QR payload and where a learner's phone finds the relay (pure; the QR panel and the learner page read these).
import { describe, expect, it } from 'vitest';
import { joinCode, learnerUrl, qrTarget, relayInfo, relayOf, type PageLocation, type RelayInfo } from './classroom.ts';
import { encodeQr } from './qr.ts';

const at = (url: string): PageLocation => {
  const u = new URL(url);
  return { protocol: u.protocol, host: u.host, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search };
};
const info = (o: Partial<RelayInfo> = {}): RelayInfo => ({ relay: 'pme', port: 8642, addresses: ['192.168.1.20'], serves: true, ...o });

describe('Stage 12: the learner address (QR payload)', () => {
  it('is ONE short address, the session code in it and the relay the page\'s own host', () => {
    const url = learnerUrl('AB2CD3', 'http://192.168.1.20:8642', '/', null);
    expect(url).toBe('http://192.168.1.20:8642/?join=AB2CD3');
    expect(joinCode(at(url))).toBe('AB2CD3');
    expect(relayOf(at(url))).toBe('ws://192.168.1.20:8642/');
  });
  it('names the relay only when it is elsewhere (a dev server beside the relay)', () => {
    expect(learnerUrl('AB2CD3', 'http://192.168.1.20:5173', '/', 'ws://192.168.1.20:8787/')).toBe('http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F');
    expect(learnerUrl('AB2CD3', 'http://192.168.1.20:8787', '/', 'ws://192.168.1.20:8787/')).toBe('http://192.168.1.20:8787/?join=AB2CD3');
    expect(relayOf(at('http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F'))).toBe('ws://192.168.1.20:8787/');
  });
  it('the longest LAN address fits a version-3 symbol (29 modules: large modules, scannable from the back of a room)', () => {
    const url = learnerUrl('AB2CD3', 'http://192.168.100.200:65535', '/', null);
    expect(url.length).toBe(41); // the longest IPv4 address and port there is
    expect(encodeQr(url).length).toBe(29);
  });
  it('a bad or missing code is no join; `?relay` alone means this host; no relay at all is null', () => {
    expect(joinCode(at('http://h/?join=ab2-cd3'))).toBe('AB2CD3');
    expect(joinCode(at('http://h/?join=AB2CD'))).toBeNull();
    expect(relayOf(at('http://127.0.0.1:8642/?relay#/'))).toBe('ws://127.0.0.1:8642/');
    expect(relayOf(at('https://example.org/app/?join=AB2CD3'))).toBe('wss://example.org/');
    expect(relayOf(at('http://127.0.0.1:5173/'))).toBeNull();
  });
});

describe('Stage 12: where the QR code sends phones', () => {
  it('the relay serves the app: its first network address, even when the instructor\'s page is on 127.0.0.1', () => {
    expect(qrTarget('AB2CD3', at('http://127.0.0.1:8642/?relay'), 'ws://127.0.0.1:8642/', info())).toEqual({ ok: true, url: 'http://192.168.1.20:8642/?join=AB2CD3', origin: 'http://192.168.1.20:8642', others: [] });
    // the relay lists the hotspot first (relay/http.ts); the computer's other networks are offered under the code
    expect(qrTarget('AB2CD3', at('http://127.0.0.1:8642/?relay'), 'ws://127.0.0.1:8642/', info({ addresses: ['192.168.2.1', '10.0.0.7'] }))).toMatchObject({ url: 'http://192.168.2.1:8642/?join=AB2CD3', others: ['http://10.0.0.7:8642/?join=AB2CD3'] });
  });
  it('says why when phones cannot join: no relay, a relay that does not answer, no network, a loopback-only page, https', () => {
    const local = at('http://127.0.0.1:5173/');
    expect(qrTarget('AB2CD3', local, null, null)).toMatchObject({ ok: false, why: expect.stringMatching(/^No relay/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', null)).toMatchObject({ ok: false, why: expect.stringMatching(/does not answer/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', info({ addresses: [] }))).toMatchObject({ ok: false, why: expect.stringMatching(/on no network/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', info({ serves: false }))).toMatchObject({ ok: false, why: expect.stringMatching(/this computer only/) });
    expect(qrTarget('AB2CD3', at('https://samhv-dev.github.io/patient-monitor-engine/'), 'ws://192.168.1.20:8787/', info({ serves: false }))).toMatchObject({ ok: false, why: expect.stringMatching(/https/) });
  });
  it('a page another device can reach, with the relay elsewhere: this page plus the relay', () => {
    expect(qrTarget('AB2CD3', at('http://192.168.1.20:5173/'), 'ws://192.168.1.20:8787/', info({ serves: false }))).toMatchObject({ ok: true, url: 'http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F' });
  });
  it('relayInfo reads /pme-relay.json next to the relay, and is null for anything else or no answer', async () => {
    const seen: string[] = [];
    const ok = (async (u: string) => (seen.push(u), { json: async () => info() })) as unknown as typeof fetch;
    expect(await relayInfo('ws://127.0.0.1:8642/', 100, ok)).toEqual(info());
    expect(seen).toEqual(['http://127.0.0.1:8642/pme-relay.json']);
    expect(await relayInfo('ws://x/', 100, (async () => ({ json: async () => ({ hello: 1 }) })) as unknown as typeof fetch)).toBeNull();
    expect(await relayInfo('ws://x/', 100, (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch)).toBeNull();
  });
});
