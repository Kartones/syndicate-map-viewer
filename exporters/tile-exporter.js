import { saveTile } from "../entities/tile.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

// "HPAL05"
const paletteFiles = ["HPAL01", "HPAL02", "HPAL03", "HPAL04"];

const palettes = paletteFiles.map((filename) => readPalette(filename));

const tiles = readTiles();

Promise.all(
  tiles.map(
    (tile, tileNum) =>
      new Promise((resolve) => {
        palettes.forEach((palette, index) => {
          saveTile(`-${tileNum}-${index}`, tile, palette);
        });
        resolve();
      })
  )
);
