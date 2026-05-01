import { readRncFile } from "./rnc-decompressor.js";

const FRAME_ENTRY_SIZE   = 8;  // u16 first, u8 width, u8 height, u16 flags, u16 next
const ELEMENT_ENTRY_SIZE = 10; // u16 sprite, i16 xOffset, i16 yOffset, u16 flipped, u16 next

export const parseSpriteAnims = (data) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = Math.floor(data.length / 2);
  const anims = new Array(count);
  for (let i = 0; i < count; i++) {
    anims[i] = view.getUint16(i * 2, true);
  }
  return anims;
};

export const parseSpriteFrames = (data) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = Math.floor(data.length / FRAME_ENTRY_SIZE);
  const frames = new Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * FRAME_ENTRY_SIZE;
    frames[i] = {
      first:  view.getUint16(base,     true),
      width:  view.getUint8 (base + 2),
      height: view.getUint8 (base + 3),
      flags:  view.getUint16(base + 4, true),
      next:   view.getUint16(base + 6, true),
    };
  }
  return frames;
};

export const parseSpriteElements = (data) => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = Math.floor(data.length / ELEMENT_ENTRY_SIZE);
  const elements = new Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * ELEMENT_ENTRY_SIZE;
    elements[i] = {
      spriteTabIndex: Math.floor(view.getUint16(base,     true) / 6),
      xOffset:        view.getInt16 (base + 2, true),
      yOffset:        view.getInt16 (base + 4, true),
      flipped:        view.getUint16(base + 6, true) !== 0,
      next:           view.getUint16(base + 8, true),
    };
  }
  return elements;
};

export const readSpriteAnims    = (filename) => parseSpriteAnims   (readRncFile(filename));
export const readSpriteFrames   = (filename) => parseSpriteFrames  (readRncFile(filename));
export const readSpriteElements = (filename) => parseSpriteElements(readRncFile(filename));
