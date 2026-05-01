import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isRncEncoded, decompressRnc, computeCrc } from "./rnc-decompressor.js";

describe("computeCrc", () => {
  it("returns 0 for empty input", () => {
    assert.equal(computeCrc(new Uint8Array([]), 0, 0), 0x0000);
  });

  it("matches known CRC-16/ARC check value for '123456789'", () => {
    // Standard CRC-16/ARC check value for the ASCII string "123456789"
    const bytes = new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]);
    assert.equal(computeCrc(bytes, 0, 9), 0xBB3D);
  });

  it("respects offset and length", () => {
    const bytes = new Uint8Array([0x00, 0x31, 0x32, 0x00]);
    assert.equal(computeCrc(bytes, 1, 2), computeCrc(new Uint8Array([0x31, 0x32]), 0, 2));
  });
});

describe("isRncEncoded", () => {
  it("returns false for data shorter than the header", () => {
    assert.equal(isRncEncoded(new Uint8Array([0x52, 0x4E, 0x43])), false);
  });

  it("returns false for non-RNC data", () => {
    const data = new Uint8Array(18).fill(0);
    assert.equal(isRncEncoded(data), false);
  });

  it("returns true for data starting with RNC\\1 signature", () => {
    const data = new Uint8Array(18).fill(0);
    data[0] = 0x52; data[1] = 0x4E; data[2] = 0x43; data[3] = 0x01;
    assert.equal(isRncEncoded(data), true);
  });
});

describe("decompressRnc", () => {
  it("returns the same buffer when data is not RNC-encoded", () => {
    const data = new Uint8Array([0x01, 0x02, 0x03]);
    assert.equal(decompressRnc(data), data);
  });

  it("throws when packed CRC does not match", () => {
    // RNC header with packedLength=1, wrong packedCrc=0xFFFF
    const data = new Uint8Array([
      0x52, 0x4E, 0x43, 0x01, // signature
      0x00, 0x00, 0x00, 0x00, // unpackedLength = 0
      0x00, 0x00, 0x00, 0x01, // packedLength = 1
      0x00, 0x00,             // unpackedCrc
      0xFF, 0xFF,             // packedCrc (wrong)
      0x00,                   // unknown
      0x00,                   // packCount
      0xAB,                   // 1 byte of packed data
    ]);
    assert.throws(() => decompressRnc(data), /CRC mismatch/);
  });

  it("decompresses a valid RNC stream with zero packs to an empty buffer", () => {
    // packCount=0, unpackedLength=0, both CRCs are 0 (CRC of 0 bytes = 0)
    const data = new Uint8Array([
      0x52, 0x4E, 0x43, 0x01, // signature
      0x00, 0x00, 0x00, 0x00, // unpackedLength = 0
      0x00, 0x00, 0x00, 0x00, // packedLength = 0
      0x00, 0x00,             // unpackedCrc = 0x0000
      0x00, 0x00,             // packedCrc = 0x0000
      0x00,                   // unknown
      0x00,                   // packCount = 0
    ]);
    const result = decompressRnc(data);
    assert.equal(result.length, 0);
    assert.ok(result instanceof Uint8Array);
  });
});
