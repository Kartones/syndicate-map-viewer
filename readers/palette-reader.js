import assert from "assert";
import Jimp from "jimp";
import { join } from "path";
import { readFileSync } from "fs";

import { DATA_FOLDER, NUM_COLORS_INGAME } from "../constants.js";

export const readPalette = (filename) => {
  const paletteContents = readPaletteFile(filename);

  assert(
    paletteContents.length === 256 * 3,
    `Expected 256*3=768 color component bytes, got ${paletteContents.length}`
  );

  const palette = new Array(NUM_COLORS_INGAME);

  for (let color = 0; color < NUM_COLORS_INGAME; color++) {
    // we scale values from [0, 63] to [0, 255]
    const red = paletteContents[color * 3] * 4;
    const green = paletteContents[color * 3 + 1] * 4;
    const blue = paletteContents[color * 3 + 2] * 4;

    // RGBA hex value
    palette[color] = Jimp.rgbaToInt(red, green, blue, 255);
  }

  return palette;
};

/*
  Palette files contain 256 colors, each with a red, green, and blue 1-byte component.
  Note that in missions the game uses 16 colors only.
  Values for each component are [0, 63]
*/
const readPaletteFile = (filename) => {
  const filePath = join(DATA_FOLDER, `${filename}.DAT`);

  const fileContentsBuffer = readFileSync(filePath, null);
  const fileContentsArray = new Uint8Array(
    fileContentsBuffer.buffer,
    fileContentsBuffer.byteOffset,
    fileContentsBuffer.length
  );

  return fileContentsArray;
};
