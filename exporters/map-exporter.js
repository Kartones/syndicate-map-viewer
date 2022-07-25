import Jimp from "jimp";
import { join } from "path";
import { exit } from "process";

import { TILE_WIDTH, TILE_HEIGHT, MAP_OUTPUT_FOLDER } from "../constants.js";
import { readMap } from "../readers/map.reader.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

const palette = readPalette("HPAL02");
const tiles = readTiles();
const map = readMap("MAP01");

const imageWidth = TILE_WIDTH * map.xSize;
const imageHeigth = TILE_HEIGHT * map.zSize;

const drawTile = (image, tileNum, xOffset, yOffset, zOffset) => {
  const xStartingOffset = xOffset * TILE_WIDTH;

  // [x,y] for writing in the image
  let x = xStartingOffset;
  let y = zOffset * TILE_HEIGHT;

  y -= yOffset * (TILE_HEIGHT / 2);

  tiles[tileNum].forEach((pixel) => {
    if (!pixel.transparent) {
      image.setPixelColor(palette[pixel.color], x, y);
    }
    if (++x === xStartingOffset + TILE_WIDTH) {
      x = xStartingOffset;
      y++;
    }
  });
};

const image = new Jimp(imageWidth, imageHeigth, 0x00000000, (err, image) => {
  if (err) {
    console.error(err);
    exit(1);
  }

  map.tilesData.forEach((tile, index) => {
    const x = index % map.xSize;
    const z = Math.floor(index / map.xSize);
    tile.forEach((tileNum, yIndex) => {
      drawTile(image, tileNum, x, yIndex, z);
    });
  });

  image.write(join(MAP_OUTPUT_FOLDER, `map01.png`));
});
