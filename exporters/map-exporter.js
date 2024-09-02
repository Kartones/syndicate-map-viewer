import { readdirSync } from "fs";
import { join } from "path";

import { Jimp } from "jimp";

import {
  TILE_WIDTH,
  MAP_OUTPUT_FOLDER,
  SUBTILE_HEIGHT,
  SUBTILE_WIDTH,
  DATA_FOLDER,
} from "../constants.js";
import { readMap } from "../readers/map.reader.js";
import { readTiles } from "../readers/tile-reader.js";
import { readPalette } from "../readers/palette-reader.js";

export const exportMap = async (fileName, paletteFileName, tiles, palette) => {
  const map = readMap(fileName);

  // As map is rotated due to the isometric projection so [0,0] beings not in the upper-left corner but way to the right
  // Each time we advance a tile in Z, is a subtile's worth of pixels and [0,<max-z>] will be the leftmost image tile
  const baseXOffset = map.zSize * SUBTILE_WIDTH;

  const imageWidth = SUBTILE_WIDTH * map.xSize + baseXOffset;
  const imageHeigth =
    SUBTILE_HEIGHT * 2 * map.zSize + SUBTILE_HEIGHT * 3 * map.ySize;

  /*
  Tiles are nicely designed to be 2x2 regarding positioning, but the extra 1x2 level is for stacking (as a column)
  */
  const drawTile = async (image, tileNum, xOffset, yOffset, zOffset) => {
    // x position is displaced to the right, and each tile advances SUBTILE_WIDTH pixels right
    const xStartingOffset = (xOffset - zOffset) * SUBTILE_WIDTH + baseXOffset;
    // y position is displaced to the right, and each tile advances SUBTILE_HEIGHT pixels down
    const yStartingOffset = (xOffset + zOffset) * SUBTILE_HEIGHT;

    // [x,y] for writing in the image
    let x = xStartingOffset;
    let y = yStartingOffset;

    // "altitude"/stacking
    y -= yOffset * SUBTILE_HEIGHT;

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

  const image = new Jimp({
    width: imageWidth,
    height: imageHeigth,
    color: 0x00000000,
    // remove alpha channel
    colorType: 2,
  });

  for (const [index, tile] of map.tilesData.entries()) {
    const x = index % map.xSize;
    const z = Math.floor(index / map.xSize);
    for (const [yIndex, tileNum] of tile.entries()) {
      await drawTile(image, tileNum, x, yIndex, z);
    }
  }

  const outputFileName = join(
    MAP_OUTPUT_FOLDER,
    `${fileName}-${paletteFileName}.png`
  );

  await image.write(outputFileName);
  console.log("Map exported: ", outputFileName);
};

// ----------------------------

let palettes = [];
let mapNames = [];

readdirSync(DATA_FOLDER)
  .filter((fileName) => fileName.endsWith(".DAT"))
  .forEach((fileName) => {
    if (fileName.startsWith("HPAL")) {
      palettes.push(readPalette(fileName));
    }
    if (fileName.startsWith("MAP")) {
      mapNames.push(fileName);
    }
  });

const tiles = readTiles();

Promise.all(
  mapNames.map(
    (mapName) =>
      new Promise((resolve) => {
        palettes.forEach((palette, paletteIndex) => {
          exportMap(mapName, `HPAL0${paletteIndex + 1}`, tiles, palette);
        });
        resolve();
      })
  )
);
