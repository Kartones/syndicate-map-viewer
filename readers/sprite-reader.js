import { readFileSync } from "fs";
import { join } from "path";

import {
  DATA_FOLDER,
  SPRITE_DAT_HEADER_SIZE,
  SPRITE_TAB_ENTRY_SIZE,
} from "../constants.js";

export const parseSpriteTab = (tabContents) => {
  const numEntries = Math.floor(tabContents.length / SPRITE_TAB_ENTRY_SIZE);
  const entries = new Array(numEntries);

  for (let i = 0; i < numEntries; i++) {
    const base = i * SPRITE_TAB_ENTRY_SIZE;
    const offset =
      (tabContents[base + 3] << 24) |
      (tabContents[base + 2] << 16) |
      (tabContents[base + 1] << 8) |
      tabContents[base];
    entries[i] = {
      offset: offset >>> 0,
      width: tabContents[base + 4],
      height: tabContents[base + 5],
    };
  }

  return entries;
};

export const isRleEncoded = (datContents) => {
  const nbSprites = datContents[0] | (datContents[1] << 8);
  return nbSprites !== 0;
};

export const readSpriteFiles = (datFilename, tabFilename) => {
  const datBuffer = readFileSync(join(DATA_FOLDER, datFilename), null);
  const tabBuffer = readFileSync(join(DATA_FOLDER, tabFilename), null);

  const datContents = new Uint8Array(datBuffer.buffer, datBuffer.byteOffset, datBuffer.length);
  const tabContents = new Uint8Array(tabBuffer.buffer, tabBuffer.byteOffset, tabBuffer.length);

  if (isRleEncoded(datContents)) {
    throw new Error(`RLE-encoded sprite data in ${datFilename} is not supported`);
  }

  const tabEntries = parseSpriteTab(tabContents);
  return { datContents, tabEntries };
};
