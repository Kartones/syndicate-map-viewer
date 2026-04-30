import { readdirSync, mkdirSync } from "fs";
import { join } from "path";

import { Jimp } from "jimp";

import { DATA_FOLDER, SPRITES_OUTPUT_FOLDER } from "../constants.js";
import { readPalette } from "../readers/palette-reader.js";
import { readSpriteFiles } from "../readers/sprite-reader.js";
import { readSprite } from "../entities/sprite.js";

const saveSprite = async (index, tabEntry, datContents, palette, outputFolder) => {
  const { width, height } = tabEntry;
  if (width === 0 || height === 0) {
    return;
  }

  const pixels = readSprite(tabEntry, datContents);

  const image = new Jimp({
    width,
    height,
    color: 0x00000000,
  });

  pixels.forEach((pixel, i) => {
    if (!pixel.transparent) {
      const x = i % width;
      const y = Math.floor(i / width);
      image.setPixelColor(palette[pixel.color], x, y);
    }
  });

  const outputPath = join(outputFolder, `sprite-${String(index).padStart(4, "0")}.png`);
  await image.write(outputPath);
};

// ----------------------------

const paletteFile = readdirSync(DATA_FOLDER)
  .filter((f) => f.startsWith("HPAL") && f.endsWith(".DAT"))
  .sort()[0];

if (!paletteFile) {
  throw new Error("No HPAL*.DAT palette file found in data/");
}

const palette = readPalette(paletteFile);

const spriteSetNames = readdirSync(DATA_FOLDER)
  .filter((f) => f.startsWith("HSPR-") && f.endsWith(".DAT"))
  .filter((datFile) => {
    const tabFile = datFile.replace(".DAT", ".TAB");
    return readdirSync(DATA_FOLDER).includes(tabFile);
  })
  .sort();

for (const datFile of spriteSetNames) {
  const tabFile = datFile.replace(".DAT", ".TAB");
  const spriteSetName = datFile.replace(".DAT", "").toLowerCase();
  const outputFolder = join(SPRITES_OUTPUT_FOLDER, spriteSetName);

  mkdirSync(outputFolder, { recursive: true });

  const { datContents, tabEntries } = readSpriteFiles(datFile, tabFile);

  console.log(`Exporting ${tabEntries.length} sprites to ${outputFolder} using palette ${paletteFile}...`);

  await Promise.all(
    tabEntries.map((entry, index) => saveSprite(index, entry, datContents, palette, outputFolder))
  );
}

console.log("Done.");
