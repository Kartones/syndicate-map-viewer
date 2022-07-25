import Jimp from "jimp";
import { join } from "path";
import { exit } from "process";

import { TILE_WIDTH, TILE_HEIGHT, MAP_OUTPUT_FOLDER } from "../constants.js";
import { readMap } from "../readers/map.reader.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

export const exportMap = (fileName, paletteFileName, tiles, palette) => {
  const map = readMap(fileName);

  // TODO: Fix width/height
  const imageWidth = TILE_WIDTH * map.xSize;
  const imageHeigth = TILE_HEIGHT * (map.zSize + map.zSize / 8);

  /*
  TODO: Document isometric tile drawing offset.

  For calculating offsets, /2 horizontal and /3 vertical because a tile is 2x3 tiles
*/
  const drawTile = (image, tileNum, xOffset, yOffset, zOffset) => {
    // TODO: Fix alignment
    // align center horizontally because of the isometric projection
    const xStartingOffset =
      ((xOffset - zOffset) * TILE_WIDTH) / 2 +
      (imageWidth / 2 - imageWidth / 8);

    const yStartingOffset = ((xOffset + zOffset) * TILE_HEIGHT) / 3;

    // [x,y] for writing in the image
    let x = xStartingOffset;
    let y = yStartingOffset;

    // "altitude"/stacking
    y -= yOffset * (TILE_HEIGHT / 3);

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

    const outputFileName = join(
      MAP_OUTPUT_FOLDER,
      `${fileName}-${paletteFileName}.png`
    );

    image.write(outputFileName);
    console.log("Map exported: ", outputFileName);
  });
};

// Only need to read once
const palette1 = readPalette("HPAL01");
const palette2 = readPalette("HPAL02");
const tiles = readTiles();

exportMap("MAP01", "HPAL01", tiles, palette1);
exportMap("MAP01", "HPAL02", tiles, palette2);
exportMap("MAP02", "HPAL01", tiles, palette1);
exportMap("MAP02", "HPAL02", tiles, palette2);
exportMap("MAP03", "HPAL01", tiles, palette1);
exportMap("MAP03", "HPAL02", tiles, palette2);
