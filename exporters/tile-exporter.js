import { readdirSync } from "fs";

import { DATA_FOLDER } from "../constants.js";
import { saveTile } from "../entities/tile.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

let palettes = readdirSync(DATA_FOLDER)
  .filter(
    (fileName) => fileName.startsWith("HPAL") && fileName.endsWith(".DAT")
  )
  .map((fileName) => readPalette(fileName));

const tiles = readTiles();

Promise.all(
  tiles.map(
    (tile, tileNum) =>
      new Promise(async (resolve) => {
        for (const [index, palette] of palettes.entries()) {
          await saveTile(`-${tileNum}-${index}`, tile, palette);
        }
        resolve();
      })
  )
);
