import assert from "assert";
import { join } from "path";
import { readFileSync } from "fs";

import {
  NUM_SUBTILES,
  OFFSET_ARRAY_LAST_OFFSET,
  DATA_FOLDER,
} from "./constants.js";

import { readTile, saveTile } from "./tile.js";

const readTilesFile = () => {
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

// -----------------------------

const contentsArray = readTilesFile();
const offsetArray = readOffsetArray(contentsArray);

// for (let i = 0; i < NUM_TILES; i++) {
//   const subtiles = readTile(i, offsetArray, contentsArray);
//   saveTile(i, subtiles);
// }

const tile = readTile(21, offsetArray, contentsArray);
saveTile(21, tile);
