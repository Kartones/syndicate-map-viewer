import assert from "assert";
import { join } from "path";
import { readFileSync } from "fs";
import Jimp from "jimp";
import { exit } from "process";

/*
1 tile = 6 subtiles
hblk01.dat stores 256 tiles (1536 subtiles)
Subtiles can be reused across tiles
*/
const NUM_TILES = 256;
const NUM_SUBTILES_PER_TILE = 6;
const NUM_SUBTILES = NUM_TILES * NUM_SUBTILES_PER_TILE;
const OFFSET_ARRAY_LAST_OFFSET = 6144;
const SUBTILE_WIDTH = 32;
const SUBTILE_HEIGHT = 16;
const BYTES_PER_ROW = 20;
const BYTES_PER_SUBTILE = BYTES_PER_ROW * SUBTILE_HEIGHT;

const DATA_FOLDER = "data";
const TILES_OUTPUT_FOLDER = "tiles";

/*
  Color data bits are also reversed
*/
class Color {
  #color;
  #transparency;

  constructor(b0, b1, b2, b3, transparency) {
    this.#color = (b0 << 3) | (b1 << 2) | (b2 << 1) | b3;
    this.#transparency = transparency;
  }

  get color() {
    return this.#color;
  }

  get transparent() {
    return this.#transparency === 1;
  }

  toString() {
    return `[${this.#color.toString().padStart(2, "0")} ${
      this.transparent ? "T" : " "
    }]`;
  }
}

const openTilesFile = () => {
  const filePath = join(DATA_FOLDER, "HBLK01.DAT");

  const fileContentsBuffer = readFileSync(filePath, null);
  const fileContentsArray = new Uint8Array(
    fileContentsBuffer.buffer,
    fileContentsBuffer.byteOffset,
    fileContentsBuffer.length
  );

  return fileContentsArray;
};

/*
  The first 6144 bytes of hblk01.dat is the offset array. This is a vector of 1536 dwords (6 per tile,
  one for each subtile, for all of the 256 tiles, stored in little endian format),
  where each offset points to the absolute position within HBLK01.DAT where the corresponding subtile is stored.
  If a subtile offset points to a position below the first 6144 bytes then that subtile is simply taken to be blank.
*/
const readOffsetArray = (fileContentsArray) => {
  const offsetArray = new Uint32Array(NUM_SUBTILES);
  for (
    let sourceIndex = 0, destinationIndex = 0;
    destinationIndex < NUM_SUBTILES;
    sourceIndex += 4, destinationIndex++
  ) {
    offsetArray[destinationIndex] =
      (fileContentsArray[sourceIndex + 3] << 24) |
      (fileContentsArray[sourceIndex + 2] << 16) |
      (fileContentsArray[sourceIndex + 1] << 8) |
      fileContentsArray[sourceIndex];

    if (offsetArray[destinationIndex] < OFFSET_ARRAY_LAST_OFFSET) {
      offsetArray[destinationIndex] = 0;
    }
  }

  assert(
    offsetArray.length === NUM_SUBTILES,
    `Expected ${NUM_SUBTILES} subtiles, got ${offsetArray.length}`
  );

  return offsetArray;
};

/*
  A tile consists of 6 subtiles: 2 per row, 3 rows total.
*/
const readTile = (tileNumber, offsetArray, contentsArray) => {
  assert(
    tileNumber < NUM_TILES,
    `Expected tile number < ${NUM_TILES}, got ${tileNumber}`
  );

  const firstSubtileOffset = tileNumber * NUM_SUBTILES_PER_TILE;

  const subtiles = new Array(6);
  for (let offset = 0; offset < NUM_SUBTILES_PER_TILE; offset++) {
    const subtileNumber = firstSubtileOffset + offset;
    subtiles[offset] = readSubtile(subtileNumber, offsetArray, contentsArray);
  }

  return subtiles;
};

/*
A subtile is 32x16 pixels
16 colors game -> 4 bits per pixel + 1 transparency bit = 5 bits per pixel
1 = 32 pixels = 5 * 32 = 160 bits = 20 bytes per row
1 row = 32 transparency bits + 32 * 4 color bits

First 4 bytes form a chunk containing transparency information for all 32 pixels,
then chunks of 4 bytes, each containing 1 bit of color information for all 32 pixels.
Bytes of a chunk go from left to right, but within a byte, bits go from right to left.

e.g.:
transparency bit of pixel 0 = bit 7 of byte 0
color bit 0 of pixel 0 = bit 7 of byte 4
color bit 1 of pixel 0 = bit 7 of byte 8
color bit 2 of pixel 0 = bit 7 of byte 12
color bit 3 of pixel 0 = bit 7 of byte 16

transparency bit of pixel 9 = bit 6 of byte 1
color bit 0 of pixel 9 = bit 6 of byte 5
color bit 1 of pixel 9 = bit 6 of byte 9
color bit 2 of pixel 9 = bit 6 of byte 13
color bit 3 of pixel 9 = bit 6 of byte 17

transparency bit of pixel 31 = bit 0 of byte 3
color bit 0 of pixel 31 = bit 0 of byte 3
color bit 1 of pixel 31 = bit 0 of byte 11
color bit 2 of pixel 31 = bit 0 of byte 15
color bit 3 of pixel 31 = bit 0 of byte 19

Finally, rows of a subtile are stored in reverse order (bottom-top), so the first row is at the end of the subtile
*/
const readSubtile = (subtileNumber, offsetArray, contentsArray) => {
  assert(
    subtileNumber < NUM_SUBTILES,
    `Expected subtile number < ${NUM_SUBTILES}, got ${subtileNumber}`
  );

  const subtileOffset = offsetArray[subtileNumber];
  const subtileByteContents = new Uint8Array(BYTES_PER_SUBTILE);

  assert(
    subtileOffset === 0 || subtileOffset > OFFSET_ARRAY_LAST_OFFSET,
    `Expected offset 0 or > ${OFFSET_ARRAY_LAST_OFFSET}, got ${subtileOffset}`
  );

  if (subtileOffset === 0) {
    return generateEmptySubtilePixels();
  }

  for (let offset = 0; offset < BYTES_PER_SUBTILE; offset++) {
    subtileByteContents[offset] = contentsArray[subtileOffset + offset];
  }

  return readSubtilePixels(subtileByteContents);
};

const generateEmptySubtilePixels = () => {
  const subtilePixels = new Array(SUBTILE_WIDTH * SUBTILE_HEIGHT);
  for (let i = 0; i < subtilePixels.length; i++) {
    subtilePixels[i] = new Color(0, 0, 0, 0, 1);
  }
  return subtilePixels;
};

/*
  Returns an array of Color objects, already reordered to be drawn left-right, top-bottom
*/
const readSubtilePixels = (subtileContents) => {
  const subtilePixels = new Array(SUBTILE_WIDTH * SUBTILE_HEIGHT);

  assert(
    subtileContents.length === BYTES_PER_SUBTILE,
    `Expected ${BYTES_PER_SUBTILE} bytes, got ${subtileContents.length}`
  );

  for (let y = 0; y < SUBTILE_HEIGHT; y++) {
    for (let x = 0; x < SUBTILE_WIDTH; x++) {
      // chunks are 4 bytes each
      const rowByteIndex = x >> 3;
      // bits inside a byte are right to left
      const indexInByte = 7 - (x % 8);

      // Index of the first byte of the row
      const contentFirstRowByteIndex = y * BYTES_PER_ROW + rowByteIndex;

      const transparencyBit =
        subtileContents[contentFirstRowByteIndex] & (1 << indexInByte) ? 1 : 0;

      const colorBit0 =
        subtileContents[contentFirstRowByteIndex + 4] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit1 =
        subtileContents[contentFirstRowByteIndex + 8] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit2 =
        subtileContents[contentFirstRowByteIndex + 12] & (1 << indexInByte)
          ? 1
          : 0;
      const colorBit3 =
        subtileContents[contentFirstRowByteIndex + 16] & (1 << indexInByte)
          ? 1
          : 0;

      const color = new Color(
        colorBit0,
        colorBit1,
        colorBit2,
        colorBit3,
        transparencyBit
      );

      subtilePixels[x + y * SUBTILE_WIDTH] = color;
    }
  }

  return subtilePixels;
};

/*
  Simulate transparent color with pink, other colors as red tones
*/
const saveTile = (tileNumber, subtiles) => {
  assert(
    subtiles.length === NUM_SUBTILES_PER_TILE,
    `Expected ${NUM_SUBTILES_PER_TILE} subtiles, got ${subtiles.length}`
  );

  const drawSubtile = (image, subtilePixels, subtileIndex) => {
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

    let x = 0;
    let y = 0;
    subtilePixels.forEach((pixel) => {
      if (!pixel.transparent) {
        const colorHack = ((16 * pixel.color) << 23) + 255;
        image.setPixelColor(
          colorHack,
          x + xOffset * SUBTILE_WIDTH,
          y + yOffset * SUBTILE_HEIGHT
        );
      }
      x++;
      if (x === SUBTILE_WIDTH) {
        x = 0;
        y++;
      }
    });
  };

  const image = new Jimp(
    SUBTILE_WIDTH * 2,
    SUBTILE_HEIGHT * 3,
    "#FF00FF",
    (err, image) => {
      if (err) {
        console.log(err);
        exit(1);
      }

      subtiles.forEach((subtile, index) => {
        drawSubtile(image, subtile, index);
      });

      image.write(join(TILES_OUTPUT_FOLDER, `tile${tileNumber}.png`));
    }
  );
};

/*
  Simulate transparent color with pink, other colors as red tones
*/
const saveSubtile = (subtilePixels, subtileNumber) => {
  const image = new Jimp(
    SUBTILE_WIDTH,
    SUBTILE_HEIGHT,
    "#FF00FF",
    (err, image) => {
      if (err) {
        console.log(err);
        exit(1);
      }

      let x = 0;
      let y = 0;
      subtilePixels.forEach((pixel) => {
        if (!pixel.transparent) {
          const colorHack = ((16 * pixel.color) << 23) + 255;
          image.setPixelColor(colorHack, x, y);
        }
        x++;
        if (x === SUBTILE_WIDTH) {
          x = 0;
          y++;
        }
      });

      image.write(join(TILES_OUTPUT_FOLDER, `subtile${subtileNumber}.png`));
    }
  );
};

// -----------------------------
const contentsArray = openTilesFile();
const offsetArray = readOffsetArray(contentsArray);

for (let i = 0; i < NUM_TILES; i++) {
  const subtiles = readTile(i, offsetArray, contentsArray);
  saveTile(i, subtiles);
}
