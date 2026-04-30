import { readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

import { Jimp } from "jimp";

import { DATA_FOLDER, SPRITES_OUTPUT_FOLDER } from "../constants.js";
import { readPalette, readFullPalette } from "../readers/palette-reader.js";
import { readSpriteDat, readSpriteTab, isRleEncoded } from "../readers/sprite-reader.js";
import { readSprite } from "../entities/sprite.js";
import { readMfntSprite, readMsprSprite } from "../entities/menu-sprite.js";

const MENU_PALETTE_FILE = "MSELECT.PAL";

const selectDecoder = (datFilename) => {
  if (datFilename.startsWith("MFNT")) return readMfntSprite;
  if (datFilename.startsWith("MSPR")) return readMsprSprite;
  return null;
};

const isMenuSpriteSet = (datFilename) =>
  datFilename.startsWith("MFNT") || datFilename.startsWith("MSPR");

const saveSprite = async (index, tabEntry, datContents, palette, outputFolder, decoder) => {
  const { width, height } = tabEntry;
  if (width === 0 || height === 0) {
    return;
  }

  const pixels = decoder(tabEntry, datContents);

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

const palette16 = readPalette(paletteFile);
const palette256 = readFullPalette(paletteFile);

let menuPalette = null;
if (existsSync(join(DATA_FOLDER, MENU_PALETTE_FILE))) {
  try {
    menuPalette = readFullPalette(MENU_PALETTE_FILE);
  } catch {
    console.warn(`Warning: ${MENU_PALETTE_FILE} could not be read — still RNC-compressed? Run: wine dernc.exe data/${MENU_PALETTE_FILE}`);
  }
} else {
  console.warn(`Warning: ${MENU_PALETTE_FILE} not found in data/. Menu sprites will be skipped.`);
}

const dataFiles = readdirSync(DATA_FOLDER);

const spriteSetFiles = dataFiles
  .filter((f) => f.endsWith(".DAT") && dataFiles.includes(f.replace(".DAT", ".TAB")))
  .sort();

for (const datFile of spriteSetFiles) {
  const datContents = readSpriteDat(datFile);
  const rleEncoded = isRleEncoded(datContents);
  const rleDecoder = rleEncoded ? selectDecoder(datFile) : null;

  if (rleEncoded && !rleDecoder) {
    console.log(`Skipping ${datFile}: RLE format not yet supported.`);
    continue;
  }

  if (isMenuSpriteSet(datFile) && !menuPalette) {
    console.log(`Skipping ${datFile}: ${MENU_PALETTE_FILE} not available (decompress it first).`);
    continue;
  }

  const spriteSetName = datFile.replace(".DAT", "").toLowerCase();
  const outputFolder = join(SPRITES_OUTPUT_FOLDER, spriteSetName);
  mkdirSync(outputFolder, { recursive: true });

  const tabFile = datFile.replace(".DAT", ".TAB");
  const tabEntries = readSpriteTab(tabFile);

  const decoder = rleDecoder ?? ((entry, dat) => readSprite(entry, dat));
  const palette = isMenuSpriteSet(datFile) ? menuPalette : (rleEncoded ? palette256 : palette16);
  const usedPaletteFile = isMenuSpriteSet(datFile) ? MENU_PALETTE_FILE : paletteFile;

  console.log(`Exporting ${tabEntries.length} sprites to ${outputFolder} using palette ${usedPaletteFile}...`);

  await Promise.all(
    tabEntries.map((entry, index) => saveSprite(index, entry, datContents, palette, outputFolder, decoder))
  );
}

console.log("Done.");
