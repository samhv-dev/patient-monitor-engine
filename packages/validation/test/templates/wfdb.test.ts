import { describe, expect, it } from 'vitest';
import { ANN, decode16, decode212, parseAnnotations, parseHeader } from '../../src/templates/wfdb.ts';
import { parseSums, sha256 } from '../../src/templates/fetch.ts';
import { resample, toInt16Base64 } from '../../src/templates/dsp.ts';
import { dominantHz, rms } from '../../../engine-core/src/util/dsp.ts';
import { decodeTemplates } from '../../../engine-core/src/l2/ecg/texture.ts';

describe('WFDB readers (header(5), signal(5), annot(5))', () => {
  it('parses a CUDB header and a PTB-XL header', () => {
    const cu = parseHeader('cu01 1 250 127232\ncu01.dat 212 400 12 0 -109 -28468 0 ECG\n');
    expect(cu).toMatchObject({ record: 'cu01', nSignals: 1, fs: 250, nSamples: 127232 });
    expect(cu.signals[0]).toMatchObject({ format: 212, gain: 400, baseline: 0, description: 'ECG' });
    const px = parseHeader('00001_hr 12 500 5000\n00001_hr.dat 16 1000.0(0)/mV 16 0 -115 13047 0 I\n' + '00001_hr.dat 16 1000.0(0)/mV 16 0 -50 11561 0 II\n'.repeat(11));
    expect(px.signals).toHaveLength(12);
    expect(px.signals[0]).toMatchObject({ format: 16, gain: 1000, baseline: 0 });
  });

  it('decodes format 212 (12-bit two’s complement, 3 bytes per pair) and format 16', () => {
    // 1 = 0x001 and −2 = 0xFFE → 0x01, 0xF0, 0xFE; 2047 = 0x7FF and −2048 = 0x800 → 0xFF, 0x87, 0x00
    const one = decode212(Uint8Array.from([0x01, 0xf0, 0xfe, 0xff, 0x87, 0x00]), 1)[0]!;
    expect([...one]).toEqual([1, -2, 2047, -2048]);
    const two = decode212(Uint8Array.from([0x01, 0xf0, 0xfe, 0xff, 0x87, 0x00]), 2);
    expect([...two[0]!]).toEqual([1, 2047]);
    expect([...two[1]!]).toEqual([-2, -2048]);
    const s16 = decode16(Uint8Array.from([0x10, 0x00, 0xff, 0xff, 0x00, 0x80, 0xff, 0x7f]), 2);
    expect([...s16[0]!]).toEqual([16, -32768]);
    expect([...s16[1]!]).toEqual([-1, 32767]);
  });

  it('parses MIT-format annotations with AUX, NUM/CHN and SKIP', () => {
    const w = (a: number, i: number) => [(a << 10 | i) & 0xff, ((a << 10) | i) >> 8];
    const aux = [...'(AFIB'].map((c) => c.charCodeAt(0));
    const bytes = [
      ...w(1, 10), // N at 10
      ...w(ANN.RHYTHM, 5), ...w(63, aux.length), ...aux, 0, // rhythm at 15 with aux "(AFIB" (odd length → pad)
      ...w(62, 1), // CHN (ignored)
      ...w(59, 0), 0x01, 0x00, 0x00, 0x00, // SKIP 65536 (high word 1, low word 0)
      ...w(ANN.VFON, 4), // at 15 + 65536 + 4
      0, 0,
    ];
    const ann = parseAnnotations(Uint8Array.from(bytes));
    expect(ann.map((a) => [a.sample, a.code, a.aux])).toEqual([[10, 1, ''], [15, ANN.RHYTHM, '(AFIB'], [65555, ANN.VFON, '']]);
  });

  it('SHA256SUMS parsing and hashing', () => {
    const m = parseSums('abc123  cu01.dat\nDEF  records500/00000/00001_hr.hea\n');
    expect(m.get('cu01.dat')).toBe('abc123');
    expect(m.get('records500/00000/00001_hr.hea')).toBe('def');
    expect(sha256(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('extraction DSP and the template format', () => {
  it('resampling 360 → 500 Hz keeps frequency and amplitude', () => {
    const x = Float64Array.from({ length: 360 * 10 }, (_, i) => Math.sin((2 * Math.PI * 6 * i) / 360));
    const y = resample(x, 360, 500);
    expect(y.length).toBe(5000);
    expect(dominantHz(y, 500, 1, 20)).toBeCloseTo(6, 0);
    expect(rms(y.subarray(100, 4900))).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it('Int16/base64 round-trips through the engine decoder', () => {
    const x = Float64Array.from({ length: 1000 }, (_, i) => Math.sin(i / 7) * 1.3);
    const [d] = decodeTemplates({ scale: 4096, items: [{ id: 't', fdomHz: 5, b64: toInt16Base64(x, 4096) }] });
    for (let i = 0; i < x.length; i++) expect(d!.x[i]).toBeCloseTo(x[i]!, 3);
  });

});
