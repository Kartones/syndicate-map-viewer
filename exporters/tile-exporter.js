import { saveTile } from "../readers/tile.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

const palettes = ["HPAL01", "HPAL02", "HPAL03", "HPAL04", "HPAL05"].map(
  (filename) => readPalette(filename)
);

const tiles = readTiles();

tiles.forEach((tile, tileNum) => {
  palettes.forEach((palette, index) => {
    saveTile(`-${tileNum}-${index}`, tile, palette);
  });
});
