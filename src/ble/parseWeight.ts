// Pure parser for BLE Weight Scale notifications.
//
// Supports two very common payload shapes (most hobbyist scales use one):
//
//   1. GATT Weight Measurement (0x2A9D): first byte = flags,
//      bytes[1..2] = uint16 little-endian weight in 5-gram units if
//      the "Imperial" flag bit is 0 (SI). We only implement SI.
//
//   2. Simple little-endian uint16 "grams" — some cheap scales just
//      emit raw grams as two bytes. We try this as a fallback.
//
// Invalid readings → return null so callers can skip.

export interface ParsedReading {
  grams: number;
  stable: boolean;
}

export function parseWeight(bytes: number[] | Uint8Array): ParsedReading | null {
  const arr = Array.from(bytes || []);
  if (arr.length < 2) return null;

  // Strategy 1: GATT 0x2A9D — flags byte + 16-bit weight in 5g units.
  if (arr.length >= 3) {
    const flags = arr[0];
    const imperial = (flags & 0x01) === 0x01;
    if (!imperial) {
      const raw = arr[1] | (arr[2] << 8);
      const grams = raw * 5; // SI unit resolution is 5g per GATT spec
      if (isPlausible(grams)) {
        // Many scales encode "stable" in a vendor-specific flag bit; we
        // conservatively treat bit 3 as the stability flag, else true.
        const stable = arr.length >= 4 ? (arr[3] & 0x01) === 0x01 : true;
        return { grams, stable };
      }
    }
  }

  // Strategy 2: raw little-endian uint16 grams.
  const raw16 = arr[0] | (arr[1] << 8);
  if (isPlausible(raw16)) {
    return { grams: raw16, stable: true };
  }

  return null;
}

// Filter obviously bogus readings: < 1g or > 10kg is suspicious for a
// food scale. Callers can re-check against their own UI constraints.
function isPlausible(grams: number): boolean {
  return Number.isFinite(grams) && grams >= 1 && grams <= 10_000;
}
