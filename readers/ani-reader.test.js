import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseSpriteAnims, parseSpriteFrames, parseSpriteElements } from "./ani-reader.js";

describe("parseSpriteAnims", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(parseSpriteAnims(new Uint8Array(0)), []);
  });

  it("parses two animation first-frame indices (little-endian uint16)", () => {
    // anim[0] = 0x0105 = 261, anim[1] = 0x0003 = 3
    const data = new Uint8Array([0x05, 0x01, 0x03, 0x00]);
    assert.deepEqual(parseSpriteAnims(data), [261, 3]);
  });
});

describe("parseSpriteFrames", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(parseSpriteFrames(new Uint8Array(0)), []);
  });

  it("parses a single 8-byte frame entry", () => {
    // first=0x0002, width=0x20, height=0x30, flags=0x0100, next=0x0004
    const data = new Uint8Array([
      0x02, 0x00, // first = 2
      0x20,       // width = 32
      0x30,       // height = 48
      0x00, 0x01, // flags = 0x0100
      0x04, 0x00, // next = 4
    ]);
    assert.deepEqual(parseSpriteFrames(data), [
      { first: 2, width: 32, height: 48, flags: 0x0100, next: 4 },
    ]);
  });

  it("parses two consecutive frame entries", () => {
    const data = new Uint8Array([
      0x01, 0x00, 0x10, 0x18, 0x00, 0x01, 0x02, 0x00,
      0x03, 0x00, 0x08, 0x0C, 0x00, 0x00, 0x01, 0x00,
    ]);
    const frames = parseSpriteFrames(data);
    assert.equal(frames.length, 2);
    assert.equal(frames[0].first, 1);
    assert.equal(frames[0].width, 16);
    assert.equal(frames[0].height, 24);
    assert.equal(frames[0].flags, 0x0100);
    assert.equal(frames[0].next, 2);
    assert.equal(frames[1].first, 3);
    assert.equal(frames[1].width, 8);
    assert.equal(frames[1].height, 12);
    assert.equal(frames[1].flags, 0x0000);
    assert.equal(frames[1].next, 1);
  });
});

describe("parseSpriteElements", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(parseSpriteElements(new Uint8Array(0)), []);
  });

  it("parses a single 10-byte element with positive offsets", () => {
    // sprite=12 (→ spriteTabIndex=2), xOffset=5, yOffset=10, flipped=0, next=7
    const data = new Uint8Array([
      0x0C, 0x00, // sprite = 12 → index 2
      0x05, 0x00, // xOffset = 5
      0x0A, 0x00, // yOffset = 10
      0x00, 0x00, // flipped = false
      0x07, 0x00, // next = 7
    ]);
    const [elem] = parseSpriteElements(data);
    assert.equal(elem.spriteTabIndex, 2);
    assert.equal(elem.xOffset, 5);
    assert.equal(elem.yOffset, 10);
    assert.equal(elem.flipped, false);
    assert.equal(elem.next, 7);
  });

  it("parses negative signed offsets correctly", () => {
    // xOffset = -3 = 0xFFFD, yOffset = -1 = 0xFFFF
    const data = new Uint8Array([
      0x06, 0x00, // sprite = 6 → index 1
      0xFD, 0xFF, // xOffset = -3
      0xFF, 0xFF, // yOffset = -1
      0x01, 0x00, // flipped = true
      0x00, 0x00, // next = 0 (end of chain)
    ]);
    const [elem] = parseSpriteElements(data);
    assert.equal(elem.spriteTabIndex, 1);
    assert.equal(elem.xOffset, -3);
    assert.equal(elem.yOffset, -1);
    assert.equal(elem.flipped, true);
    assert.equal(elem.next, 0);
  });
});
