import { Pixel } from "./pixel.js";

const TRANSPARENT_COLOR = 0xfc;

const transparentPixel = () => Pixel.fromIndex(TRANSPARENT_COLOR, true);

const pixelFromByte = (byte) =>
  Pixel.fromIndex(byte, byte === TRANSPARENT_COLOR);

export const readMfntSprite = ({ offset, width, height }, datContents) => {
  if (width === 0 || height === 0) {
    return [];
  }

  const pixels = new Array(width * height);
  let bytePos = offset;

  for (let row = 0; row < height; row++) {
    const rowStart = row * width;
    let col = 0;

    while (true) {
      const b = datContents[bytePos++];

      if (b === 0x00) {
        while (col < width) pixels[rowStart + col++] = transparentPixel();
        break;
      } else if (b === 0xfe) {
        const n = datContents[bytePos++];
        for (let i = 0; i < n - 1; i++) pixels[rowStart + col++] = transparentPixel();
      } else if (b === 0xff) {
        const n = datContents[bytePos++];
        for (let i = 0; i < n; i++) pixels[rowStart + col++] = pixelFromByte(datContents[bytePos++]);
      } else if (b < 0x80) {
        for (let i = 0; i < b; i++) pixels[rowStart + col++] = pixelFromByte(datContents[bytePos++]);
      } else {
        pixels[rowStart + col++] = pixelFromByte(b);
      }
    }
  }

  return pixels;
};

export const readMsprSprite = ({ offset, width, height }, datContents) => {
  if (width === 0 || height === 0) {
    return [];
  }

  const pixels = new Array(width * height);
  let bytePos = offset;

  for (let row = 0; row < height; row++) {
    const rowStart = row * width;
    let col = 0;

    // Byte is signed int8: negative = transparent run, positive = pixel run, zero = end of row
    let rl = (datContents[bytePos++] << 24) >> 24;
    while (rl !== 0) {
      if (rl < 0) {
        const count = -rl;
        for (let i = 0; i < count; i++) pixels[rowStart + col++] = transparentPixel();
      } else {
        for (let i = 0; i < rl; i++) pixels[rowStart + col++] = Pixel.fromIndex(datContents[bytePos++], false);
      }
      rl = (datContents[bytePos++] << 24) >> 24;
    }
    while (col < width) pixels[rowStart + col++] = transparentPixel();
  }

  return pixels;
};
