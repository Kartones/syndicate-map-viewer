import { join } from "path";
import { readFileSync } from "fs";

import { DATA_FOLDER } from "../constants.js";
import { Map } from "../entities/map.js";

const readMapFile = (filename) => {
  const filePath = join(DATA_FOLDER, filename);

  const fileContentsBuffer = readFileSync(filePath, null);
  const fileContentsArray = new Uint8Array(
    fileContentsBuffer.buffer,
    fileContentsBuffer.byteOffset,
    fileContentsBuffer.length
  );

  return fileContentsArray;
};

const readTilesOffsetArray = (fileContentsArray, xSize, zSize) => {
  const tilesOffsetArray = new Uint32Array(xSize * zSize);

  // first 12 bytes as are the dimensions of the map (already read)
  for (
    let sourceIndex = 12, destinationIndex = 0;
    destinationIndex < tilesOffsetArray.length;
    sourceIndex += 4, destinationIndex++
  ) {
    tilesOffsetArray[destinationIndex] =
      (fileContentsArray[sourceIndex + 3] << 24) |
      (fileContentsArray[sourceIndex + 2] << 16) |
      (fileContentsArray[sourceIndex + 1] << 8) |
      fileContentsArray[sourceIndex];
    // because offsets implicitly skip the map dimensions (why is not consistent with HBLK01 offset array?)
    tilesOffsetArray[destinationIndex] += 12;
  }

  return tilesOffsetArray;
};

const populateMap = (
  fileContentsArray,
  readTilesOffsetArray,
  xSize,
  ySize,
  zSize
) => {
  const map = new Array(xSize * zSize);
  for (let z = 0; z < zSize; z++) {
    for (let x = 0; x < xSize; x++) {
      const offset = readTilesOffsetArray[x + z * xSize];
      map[z * xSize + x] = new Array(ySize);
      for (let y = 0; y < ySize; y++) {
        map[z * xSize + x][y] = fileContentsArray[offset + y];
      }
    }
  }

  return map;
};

/*
  Map file contains:
  DWord x tiles count (horizontal position)
  DWord y tiles count ("altitude"/stacking)
  DWord z tiles count (vertical position)
  DWord tiles offset array (offset in file)
  Byte tile data, grouped per ySize (stacking)
*/
export const readMap = (filename) => {
  const mapContents = readMapFile(filename);

  const xSize =
    (mapContents[3] << 24) |
    (mapContents[2] << 16) |
    (mapContents[1] << 8) |
    mapContents[0];

  const ySize =
    (mapContents[11] << 24) |
    (mapContents[10] << 16) |
    (mapContents[9] << 8) |
    mapContents[8];

  const zSize =
    (mapContents[7] << 24) |
    (mapContents[6] << 16) |
    (mapContents[5] << 8) |
    mapContents[4];

  const tilesOffsetArray = readTilesOffsetArray(mapContents, xSize, zSize);

  const mapData = populateMap(
    mapContents,
    tilesOffsetArray,
    xSize,
    ySize,
    zSize
  );

  const map = new Map(xSize, ySize, zSize, mapData);

  return map;
};
