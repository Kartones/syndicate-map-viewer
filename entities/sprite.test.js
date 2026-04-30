import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { readSprite } from "./sprite.js";

describe("readSprite", () => {
  it("returns empty array for zero-dimension sprite", () => {
    const dat = new Uint8Array([0, 0]);
    assert.deepEqual(readSprite({ offset: 0, width: 0, height: 0 }, dat), []);
    assert.deepEqual(readSprite({ offset: 0, width: 0, height: 5 }, dat), []);
    assert.deepEqual(readSprite({ offset: 0, width: 8, height: 0 }, dat), []);
  });

  it("decodes a single 8-pixel row with all pixels color 1, all opaque", () => {
    // block: trans=0x00 (all opaque), c0=0xFF (bit0=1 for all), c1=c2=c3=0x00
    // color = (0<<3)|(0<<2)|(0<<1)|1 = 1, transparent = false
    const dat = new Uint8Array([
      0x00, 0x00, // nb_sprites header (offset 0-1)
      0x00, 0xff, 0x00, 0x00, 0x00, // one 8-pixel block
    ]);
    const pixels = readSprite({ offset: 2, width: 8, height: 1 }, dat);

    assert.equal(pixels.length, 8);
    pixels.forEach((p) => {
      assert.equal(p.color, 1);
      assert.equal(p.transparent, false);
    });
  });

  it("decodes transparency correctly: bit set means transparent", () => {
    // trans=0xFF means all 8 pixels are transparent
    const dat = new Uint8Array([
      0x00, 0x00,
      0xff, 0x00, 0x00, 0x00, 0x00,
    ]);
    const pixels = readSprite({ offset: 2, width: 8, height: 1 }, dat);

    assert.equal(pixels.length, 8);
    pixels.forEach((p) => assert.equal(p.transparent, true));
  });

  it("decodes pixel color bits spread across 4 color bytes", () => {
    // color index 5 = 0b0101: bit0=1, bit1=0, bit2=1, bit3=0
    // Set c0=0xFF (bit0=1 for all), c1=0x00, c2=0xFF (bit2=1 for all), c3=0x00
    const dat = new Uint8Array([
      0x00, 0x00,
      0x00, 0xff, 0x00, 0xff, 0x00,
    ]);
    const pixels = readSprite({ offset: 2, width: 8, height: 1 }, dat);

    assert.equal(pixels.length, 8);
    pixels.forEach((p) => assert.equal(p.color, 5));
  });

  it("handles width not a multiple of 8 (partial block padding ignored)", () => {
    // width=3, height=1: stored in 1 block (5 bytes), only first 3 pixels matter
    // trans=0x00, c0=0xE0 (bits 7,6,5 set → pixels 0,1,2 have bit0=1), c1=c2=c3=0x00
    // pixel 0: bit 7 of c0=1 → bit0=1, color=1
    // pixel 1: bit 6 of c0=1 → bit0=1, color=1
    // pixel 2: bit 5 of c0=1 → bit0=1, color=1
    const dat = new Uint8Array([
      0x00, 0x00,
      0x00, 0xe0, 0x00, 0x00, 0x00,
    ]);
    const pixels = readSprite({ offset: 2, width: 3, height: 1 }, dat);

    assert.equal(pixels.length, 3);
    pixels.forEach((p) => assert.equal(p.color, 1));
  });

  it("stores rows top-to-bottom: first bytes in dat are the top row", () => {
    // 8x2 sprite
    // top row (stored first):    c0=0xFF → color 1 for all pixels
    // bottom row (stored second): c1=0xFF → color 2 for all pixels
    const dat = new Uint8Array([
      0x00, 0x00,
      0x00, 0xff, 0x00, 0x00, 0x00, // top row: color 1
      0x00, 0x00, 0xff, 0x00, 0x00, // bottom row: color 2
    ]);
    const pixels = readSprite({ offset: 2, width: 8, height: 2 }, dat);

    assert.equal(pixels.length, 16);
    // top row (row 0 in output) = color 1
    for (let x = 0; x < 8; x++) assert.equal(pixels[x].color, 1);
    // bottom row (row 1 in output) = color 2
    for (let x = 0; x < 8; x++) assert.equal(pixels[8 + x].color, 2);
  });
});
