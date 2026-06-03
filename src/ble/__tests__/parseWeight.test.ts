import { parseWeight } from '../parseWeight';

describe('parseWeight', () => {
  it('returns null for empty or too-short buffers', () => {
    expect(parseWeight([])).toBeNull();
    expect(parseWeight([0x00])).toBeNull();
  });

  it('parses GATT 0x2A9D SI weight (5g units)', () => {
    // flags=0 (SI, not stable), raw=50 → 50 * 5 = 250g
    const parsed = parseWeight([0x00, 0x32, 0x00]);
    expect(parsed).not.toBeNull();
    expect(parsed!.grams).toBe(250);
  });

  it('parses GATT 0x2A9D with stability bit set', () => {
    // flags=0, raw=40 → 200g, stability byte 0x01 → stable
    const parsed = parseWeight([0x00, 0x28, 0x00, 0x01]);
    expect(parsed).toEqual({ grams: 200, stable: true });
  });

  it('falls back to raw uint16 grams when GATT parse is implausible', () => {
    // Only 2 bytes, little-endian: 150 | (0 << 8) = 150 grams
    const parsed = parseWeight([0x96, 0x00]);
    expect(parsed).toEqual({ grams: 150, stable: true });
  });

  it('rejects obviously bogus readings (> 10kg)', () => {
    // flags=0, raw=0xFFFF → 327,675g — bogus, but the SI path will reject
    // since we gate on isPlausible. Then the raw16 fallback gives 65535 → also rejected.
    expect(parseWeight([0x00, 0xff, 0xff])).toBeNull();
  });

  it('rejects zero-weight readings', () => {
    // flags=0, raw=0 → 0g, implausible.
    // raw16 fallback: first two bytes = 0 | 0<<8 = 0 → implausible → null.
    expect(parseWeight([0x00, 0x00, 0x00])).toBeNull();
  });

  it('accepts Uint8Array input', () => {
    const parsed = parseWeight(new Uint8Array([0x00, 0x14, 0x00]));
    expect(parsed?.grams).toBe(100);
  });
});
