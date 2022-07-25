import assert from "assert";

import { Pixel } from "../entities/pixel.js";
import {
  NUM_SUBTILES,
  OFFSET_ARRAY_LAST_OFFSET,
  SUBTILE_WIDTH,
  SUBTILE_HEIGHT,
  BYTES_PER_ROW,
  BYTES_PER_SUBTILE,
} from "../constants.js";

/*
A subtile is 32x16 pixels
16 colors game -> 4 bits per pixel + 1 transparency bit = 5 bits per pixel
1 = 32 pixels = 5 * 32 = 160 bits = 20 bytes per row
1 row = 32 transparency bits + 32 * 4 color bits

First 4 bytes form a chunk containing transparency information for all 32 pixels,
then chunks of 4 bytes, each containing 1 bit of color information for all 32 pixels.
Bytes of a chunk go from left to right, but within a byte, bits go from right to left.

e.g.:
transparency bit of pixel 0 = bit 7 of byte 0
color bit 0 of pixel 0 = bit 7 of byte 4
color bit 1 of pixel 0 = bit 7 of byte 8
color bit 2 of pixel 0 = bit 7 of byte 12
color bit 3 of pixel 0 = bit 7 of byte 16

transparency bit of pixel 9 = bit 6 of byte 1
color bit 0 of pixel 9 = bit 6 of byte 5
color bit 1 of pixel 9 = bit 6 of byte 9
color bit 2 of pixel 9 = bit 6 of byte 13
color bit 3 of pixel 9 = bit 6 of byte 17

transparency bit of pixel 31 = bit 0 of byte 3
color bit 0 of pixel 31 = bit 0 of byte 3
color bit 1 of pixel 31 = bit 0 of byte 11
color bit 2 of pixel 31 = bit 0 of byte 15
color bit 3 of pixel 31 = bit 0 of byte 19

Finally, rows of a subtile are stored in reverse order (bottom-top), so the first row is at the end of the subtile
*/
export const readSubtile = (subtileNumber, offsetArray, contentsArray) => {
  assert(
    subtileNumber < NUM_SUBTILES,
    `Expected subtile number < ${NUM_SUBTILES}, got ${subtileNumber}`
  );

  const subtileOffset = offsetArray[subtileNumber];
  const subtileByteContents = new Uint8Array(BYTES_PER_SUBTILE);

  assert(
    subtileOffset === 0 || subtileOffset > OFFSET_ARRAY_LAST_OFFSET,
    `Expected offset 0 or > ${OFFSET_ARRAY_LAST_OFFSET}, got ${subtileOffset}`
  );

  if (subtileOffset === 0) {
    return generateEmptySubtilePixels();
  }

  for (let offset = 0; offset < BYTES_PER_SUBTILE; offset++) {
    subtileByteContents[offset] = contentsArray[subtileOffset + offset];
  }

  return readSubtilePixels(subtileByteContents);
};

const generateEmptySubtilePixels = () => {
  const subtilePixels = new Array(SUBTILE_WIDTH * SUBTILE_HEIGHT);
  for (let i = 0; i < subtilePixels.length; i++) {
    subtilePixels[i] = new Pixel(0, 0, 0, 0, 1);
  }
  return subtilePixels;
};

/*
  Returns an array of Color objects, already reordered to be drawn left-right, top-bottom
*/
const readSubtilePixels = (subtileContents) => {
  const subtilePixels = new Array(SUBTILE_WIDTH * SUBTILE_HEIGHT);

  assert(
    subtileContents.length === BYTES_PER_SUBTILE,
    `Expected ${BYTES_PER_SUBTILE} bytes, got ${subtileContents.length}`
  );

  for (let y = 0; y < SUBTILE_HEIGHT; y++) {
    for (let x = 0; x < SUBTILE_WIDTH; x++) {
      // chunks are 4 bytes each
      const rowByteIndex = x >> 3;
      // bits inside a byte are right to left
      const indexInByte = 7 - (x % 8);

      // Index of the first byte of the row
      const contentFirstRowByteIndex = y * BYTES_PER_ROW + rowByteIndex;

      const transparencyBit =
        subtileContents[contentFirstRowByteIndex] & (1 << indexInByte) ? 1 : 0;

      const colorBit0 =
        subtileContents[contentFirstRowByteIndex + 4] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit1 =
        subtileContents[contentFirstRowByteIndex + 8] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit2 =
        subtileContents[contentFirstRowByteIndex + 12] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit3 =
        subtileContents[contentFirstRowByteIndex + 16] & (1 << indexInByte)
          ? 1
          : 0;

      const color = new Pixel(
        colorBit0,
        colorBit1,
        colorBit2,
        colorBit3,
        transparencyBit
      );

      subtilePixels[x + y * SUBTILE_WIDTH] = color;
    }
  }

  return subtilePixels;
};
