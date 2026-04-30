import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { readMfntSprite, readMsprSprite } from "./menu-sprite.js";

const TRANSPARENT = 0xfc;
const INK = 0xfd;

// ── MFNT-0 RLE decoder ────────────────────────────────────────────────────────

describe("readMfntSprite", () => {
  it("returns empty array for zero-dimension sprite", () => {
    assert.deepEqual(readMfntSprite({ offset: 0, width: 0, height: 0 }, new Uint8Array()), []);
    assert.deepEqual(readMfntSprite({ offset: 0, width: 0, height: 3 }, new Uint8Array()), []);
  });

  it("00 fills remaining row with transparent", () => {
    // width=4, height=1: just end-of-row → all transparent
    const dat = new Uint8Array([0x00, 0x00, 0x00]); // header + 00
    const pixels = readMfntSprite({ offset: 2, width: 4, height: 1 }, dat);
    assert.equal(pixels.length, 4);
    pixels.forEach((p) => assert.equal(p.transparent, true));
  });

  it("fe N produces N-1 transparent pixels", () => {
    // width=5: fe 04 → 3 transparent, then 00 → 2 more transparent = 5 total
    const dat = new Uint8Array([0x00, 0x00, 0xfe, 0x04, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 5, height: 1 }, dat);
    assert.equal(pixels.length, 5);
    pixels.forEach((p) => assert.equal(p.transparent, true));
  });

  it("ff N reads N raw pixels", () => {
    // width=3: ff 02 fd fc → ink, transparent, then 00 → 1 more transparent
    const dat = new Uint8Array([0x00, 0x00, 0xff, 0x02, INK, TRANSPARENT, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    assert.equal(pixels[0].transparent, false);
    assert.equal(pixels[0].color, INK);
    assert.equal(pixels[1].transparent, true);
    assert.equal(pixels[2].transparent, true);
  });

  it("small count N reads N raw pixels", () => {
    // width=3: 02 fd fc → ink, transparent, then 00 → 1 more transparent
    const dat = new Uint8Array([0x00, 0x00, 0x02, INK, TRANSPARENT, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    assert.equal(pixels[0].color, INK);
    assert.equal(pixels[1].transparent, true);
    assert.equal(pixels[2].transparent, true);
  });

  it("standalone fc is transparent", () => {
    // width=3: fc fc fc 00
    const dat = new Uint8Array([0x00, 0x00, TRANSPARENT, TRANSPARENT, TRANSPARENT, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    pixels.forEach((p) => assert.equal(p.transparent, true));
  });

  it("standalone fd is an opaque ink pixel", () => {
    // width=3: fd fd 00 → ink ink transparent
    const dat = new Uint8Array([0x00, 0x00, INK, INK, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    assert.equal(pixels[0].transparent, false);
    assert.equal(pixels[0].color, INK);
    assert.equal(pixels[1].transparent, false);
    assert.equal(pixels[2].transparent, true);
  });

  it("decodes a real MFNT row: fe 01 fc ff 03 fc fd fc 00 (width=7)", () => {
    // fe 01 → 0 transparent
    // fc → 1 transparent
    // ff 03 → 3 pixels: fc(T), fd(I), fc(T)
    // 00 → 3 trailing transparent
    // result: T T I T T T T
    const dat = new Uint8Array([
      0x00, 0x00,
      0xfe, 0x01, TRANSPARENT, 0xff, 0x03, TRANSPARENT, INK, TRANSPARENT, 0x00,
    ]);
    const pixels = readMfntSprite({ offset: 2, width: 7, height: 1 }, dat);
    assert.equal(pixels.length, 7);
    assert.equal(pixels[0].transparent, true);
    assert.equal(pixels[1].transparent, true);
    assert.equal(pixels[2].transparent, false);
    assert.equal(pixels[2].color, INK);
    assert.equal(pixels[3].transparent, true);
    assert.equal(pixels[4].transparent, true);
    assert.equal(pixels[5].transparent, true);
    assert.equal(pixels[6].transparent, true);
  });

  it("handles multiple rows", () => {
    // 2 rows, width=2: row1=fd 00, row2=fc fc 00
    const dat = new Uint8Array([0x00, 0x00, INK, 0x00, TRANSPARENT, TRANSPARENT, 0x00]);
    const pixels = readMfntSprite({ offset: 2, width: 2, height: 2 }, dat);
    assert.equal(pixels.length, 4);
    assert.equal(pixels[0].transparent, false); // row 0, col 0 = ink
    assert.equal(pixels[1].transparent, true);  // row 0, col 1 = transparent (from 00)
    assert.equal(pixels[2].transparent, true);  // row 1, col 0
    assert.equal(pixels[3].transparent, true);  // row 1, col 1
  });
});

// ── MSPR-0 raw 8bpp decoder ───────────────────────────────────────────────────

describe("readMsprSprite", () => {
  it("returns empty array for zero-dimension sprite", () => {
    assert.deepEqual(readMsprSprite({ offset: 0, width: 0, height: 0 }, new Uint8Array()), []);
  });

  it("decodes a row with count equal to width", () => {
    // width=3, height=1: 03 aa bb cc 00 → 3 pixels
    const dat = new Uint8Array([0x00, 0x00, 0x03, 0xaa, 0xbb, 0xcc, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    assert.equal(pixels[0].color, 0xaa);
    assert.equal(pixels[1].color, 0xbb);
    assert.equal(pixels[2].color, 0xcc);
    pixels.forEach((p) => assert.equal(p.transparent, false));
  });

  it("0xfc inside a pixel run is opaque (not the transparency sentinel)", () => {
    // MSPR transparency is encoded structurally (negative rl), not by color value
    const dat = new Uint8Array([0x00, 0x00, 0x03, TRANSPARENT, 0xbb, TRANSPARENT, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels[0].transparent, false);
    assert.equal(pixels[0].color, TRANSPARENT);
    assert.equal(pixels[1].transparent, false);
    assert.equal(pixels[2].transparent, false);
    assert.equal(pixels[2].color, TRANSPARENT);
  });

  it("count less than width fills remainder with transparent", () => {
    // width=4, count=2: 02 fd fe 00 → 2 pixels + 2 transparent
    const dat = new Uint8Array([0x00, 0x00, 0x02, 0xfd, 0xfe, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 4, height: 1 }, dat);
    assert.equal(pixels.length, 4);
    assert.equal(pixels[0].color, 0xfd);
    assert.equal(pixels[1].color, 0xfe);
    assert.equal(pixels[2].transparent, true);
    assert.equal(pixels[3].transparent, true);
  });

  it("handles multiple rows", () => {
    // width=2, height=2
    // row0: 02 aa bb 00 → 2 opaque pixels, end
    // row1: 01 cc ff 00 → 1 opaque pixel, 0xff=-1→1 transparent, end
    const dat = new Uint8Array([
      0x00, 0x00,
      0x02, 0xaa, 0xbb, 0x00,
      0x01, 0xcc, 0xff, 0x00,
    ]);
    const pixels = readMsprSprite({ offset: 2, width: 2, height: 2 }, dat);
    assert.equal(pixels.length, 4);
    assert.equal(pixels[0].color, 0xaa);
    assert.equal(pixels[1].color, 0xbb);
    assert.equal(pixels[2].color, 0xcc);
    assert.equal(pixels[3].transparent, true);
  });

  it("ff N skips 1 transparent then reads N pixels", () => {
    // width=5: ff 03 aa bb cc 00 → [T, aa, bb, cc, T]
    const dat = new Uint8Array([0x00, 0x00, 0xff, 0x03, 0xaa, 0xbb, 0xcc, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 5, height: 1 }, dat);
    assert.equal(pixels.length, 5);
    assert.equal(pixels[0].transparent, true);
    assert.equal(pixels[1].color, 0xaa);
    assert.equal(pixels[2].color, 0xbb);
    assert.equal(pixels[3].color, 0xcc);
    assert.equal(pixels[4].transparent, true);
  });

  it("fe N skips 2 transparent then reads N pixels", () => {
    // width=6: fe 03 aa bb cc 00 → [T, T, aa, bb, cc, T]
    const dat = new Uint8Array([0x00, 0x00, 0xfe, 0x03, 0xaa, 0xbb, 0xcc, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 6, height: 1 }, dat);
    assert.equal(pixels.length, 6);
    assert.equal(pixels[0].transparent, true);
    assert.equal(pixels[1].transparent, true);
    assert.equal(pixels[2].color, 0xaa);
    assert.equal(pixels[3].color, 0xbb);
    assert.equal(pixels[4].color, 0xcc);
    assert.equal(pixels[5].transparent, true);
  });

  it("multiple codes per row interleave transparent and pixel runs", () => {
    // width=7: fe 02 aa bb ff 01 cc 00 → [T, T, aa, bb, T, cc, T]
    const dat = new Uint8Array([0x00, 0x00, 0xfe, 0x02, 0xaa, 0xbb, 0xff, 0x01, 0xcc, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 7, height: 1 }, dat);
    assert.equal(pixels.length, 7);
    assert.equal(pixels[0].transparent, true);
    assert.equal(pixels[1].transparent, true);
    assert.equal(pixels[2].color, 0xaa);
    assert.equal(pixels[3].color, 0xbb);
    assert.equal(pixels[4].transparent, true);
    assert.equal(pixels[5].color, 0xcc);
    assert.equal(pixels[6].transparent, true);
  });

  it("color 0x00 is opaque black pixel inside a counted run", () => {
    // width=3: ff 02 00 aa 00 → [T, 0x00(opaque black), aa]
    const dat = new Uint8Array([0x00, 0x00, 0xff, 0x02, 0x00, 0xaa, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 3, height: 1 }, dat);
    assert.equal(pixels.length, 3);
    assert.equal(pixels[0].transparent, true);
    assert.equal(pixels[1].color, 0x00);
    assert.equal(pixels[1].transparent, false);
    assert.equal(pixels[2].color, 0xaa);
  });

  it("0x80-0xef are negative: large transparent runs", () => {
    // 0xe0 = -32 as int8 → 32 transparent pixels, then 0x01 aa 00 → 1 opaque pixel, end
    const dat = new Uint8Array([0x00, 0x00, 0xe0, 0x01, 0xaa, 0x00]);
    const pixels = readMsprSprite({ offset: 2, width: 33, height: 1 }, dat);
    assert.equal(pixels.length, 33);
    for (let i = 0; i < 32; i++) assert.equal(pixels[i].transparent, true);
    assert.equal(pixels[32].transparent, false);
    assert.equal(pixels[32].color, 0xaa);
  });
});
