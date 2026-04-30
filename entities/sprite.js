import { Pixel } from "./pixel.js";
import { SPRITE_BLOCK_SIZE, SPRITE_BYTES_PER_BLOCK } from "../constants.js";

export const readSprite = ({ offset, width, height }, datContents) => {
  if (width === 0 || height === 0) {
    return [];
  }

  const pixels = new Array(width * height);
  const blocksPerRow = Math.ceil(width / SPRITE_BLOCK_SIZE);
  const bytesPerRow = blocksPerRow * SPRITE_BYTES_PER_BLOCK;

  for (let row = 0; row < height; row++) {
    const rowDataOffset = offset + row * bytesPerRow;

    for (let x = 0; x < width; x++) {
      const blockOffset = rowDataOffset + Math.floor(x / SPRITE_BLOCK_SIZE) * SPRITE_BYTES_PER_BLOCK;
      const bitPos = 7 - (x % SPRITE_BLOCK_SIZE);

      const transparencyBit = (datContents[blockOffset] >> bitPos) & 1;
      const colorBit0 = (datContents[blockOffset + 1] >> bitPos) & 1;
      const colorBit1 = (datContents[blockOffset + 2] >> bitPos) & 1;
      const colorBit2 = (datContents[blockOffset + 3] >> bitPos) & 1;
      const colorBit3 = (datContents[blockOffset + 4] >> bitPos) & 1;

      pixels[row * width + x] = new Pixel(colorBit0, colorBit1, colorBit2, colorBit3, transparencyBit);
    }
  }

  return pixels;
};
