import assert from "assert";
import Jimp from "jimp";
import { join } from "path";
import { exit } from "process";

import {
  NUM_TILES,
  NUM_SUBTILES_PER_TILE,
  SUBTILE_WIDTH,
  SUBTILE_HEIGHT,
  TILES_OUTPUT_FOLDER,
  TILE_WIDTH,
  TILE_HEIGHT,
} from "../constants.js";

import { readSubtile } from "./subtile.js";

/*
  A tile consists of 6 subtiles: 2 per row, 3 rows total
*/
export const readTile = (tileNumber, offsetArray, contentsArray) => {
  assert(
    tileNumber < NUM_TILES,
    `Expected tile number < ${NUM_TILES}, got ${tileNumber}`
  );

  const firstSubtileOffset = tileNumber * NUM_SUBTILES_PER_TILE;

  const subtiles = new Array(NUM_SUBTILES_PER_TILE);
  for (let offset = 0; offset < NUM_SUBTILES_PER_TILE; offset++) {
    const subtileNumber = firstSubtileOffset + offset;
    subtiles[offset] = readSubtile(subtileNumber, offsetArray, contentsArray);
  }

  return joinSubtiles(subtiles);
};

export const saveTile = (filenameSuffix, tilePixels, palette) => {
  const _image = new Jimp(TILE_WIDTH, TILE_HEIGHT, 0x00000000, (err, image) => {
    if (err) {
      console.error(err);
      exit(1);
    }

    let x = 0;
    let y = 0;
    tilePixels.forEach((pixel) => {
      if (!pixel.transparent) {
        image.setPixelColor(palette[pixel.color], x, y);
      }
      x++;
      if (x === TILE_WIDTH) {
        x = 0;
        y++;
      }
    });

    image.write(join(TILES_OUTPUT_FOLDER, `tile${filenameSuffix}.png`));
  });
};

const joinSubtiles = (subtiles) => {
  assert(
    subtiles.length === NUM_SUBTILES_PER_TILE,
    `Expected ${NUM_SUBTILES_PER_TILE} subtiles, got ${subtiles.length}`
  );

  const tilePixels = new Array(
    SUBTILE_WIDTH * SUBTILE_HEIGHT * NUM_SUBTILES_PER_TILE
  );

  const drawSubtile = (tilePixels, subtilePixels, subtileIndex) => {
    let xOffset = 0;
    let yOffset = 0;
    // Subtiles ordering to form a tile:
    // 0 3
    // 1 4
    // 2 5
    switch (subtileIndex) {
      case 0:
        xOffset = 0;
        yOffset = 0;
        break;
      case 1:
        xOffset = 0;
        yOffset = 1;
        break;
      case 2:
        xOffset = 0;
        yOffset = 2;
        break;
      case 3:
        xOffset = 1;
        yOffset = 0;
        break;
      case 4:
        xOffset = 1;
        yOffset = 1;
        break;
      case 5:
        xOffset = 1;
        yOffset = 2;
        break;
      default:
        throw new Error(`Unexpected subtile index ${subtileIndex}`);
    }

    const xStartingOffset = xOffset * SUBTILE_WIDTH;
    let x = xStartingOffset;
    let y = yOffset * SUBTILE_HEIGHT;

    subtilePixels.forEach((pixel) => {
      tilePixels[y * TILE_WIDTH + x] = pixel;

      if (++x === xStartingOffset + SUBTILE_WIDTH) {
        x = xStartingOffset;
        y++;
      }
    });
  };

  subtiles.forEach((subtile, subtileIndex) =>
    drawSubtile(tilePixels, subtile, subtileIndex)
  );

  return tilePixels;
};
