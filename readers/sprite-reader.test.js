import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseSpriteTab, isRleEncoded } from "./sprite-reader.js";

describe("parseSpriteTab", () => {
  it("returns empty array for empty buffer", () => {
    assert.deepEqual(parseSpriteTab(new Uint8Array(0)), []);
  });

  it("parses a single TAB entry", () => {
    // offset=2 (LE uint32), width=16, height=7
    const buf = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x10, 0x07]);
    const entries = parseSpriteTab(buf);
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], { offset: 2, width: 16, height: 7 });
  });

  it("parses multiple TAB entries", () => {
    // entry 0: offset=0, width=0, height=0 (null entry)
    // entry 1: offset=2, width=16, height=7
    const buf = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x02, 0x00, 0x00, 0x00, 0x10, 0x07,
    ]);
    const entries = parseSpriteTab(buf);
    assert.equal(entries.length, 2);
    assert.deepEqual(entries[0], { offset: 0, width: 0, height: 0 });
    assert.deepEqual(entries[1], { offset: 2, width: 16, height: 7 });
  });
});

describe("isRleEncoded", () => {
  it("returns false when nb_sprites header is 0", () => {
    const dat = new Uint8Array([0x00, 0x00, 0xaa, 0xbb]);
    assert.equal(isRleEncoded(dat), false);
  });

  it("returns true when nb_sprites header is non-zero", () => {
    const dat = new Uint8Array([0x53, 0x00, 0xaa, 0xbb]);
    assert.equal(isRleEncoded(dat), true);
  });
});
