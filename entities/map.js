import assert from "assert";

/*
 Using left hand system for xyz coordinates (still not easy as engine renders in isometric view)

     ^
     |  y
     |
     * ---> x
    /
   /
  /  z

  x: (horizontal position
  y: "altitude"/stacking
  z: vertical position

  tilesData is a unidimensional array, containing a sub-array for each tile that represents
  the stack of vertical tiles at that position.
*/
export class Map {
  #xSize;
  #ySize;
  #zSize;
  #tilesData;

  constructor(xSize, ySize, zSize, tilesData) {
    this.#xSize = xSize;
    this.#ySize = ySize;
    this.#zSize = zSize;

    assert(
      tilesData.length === xSize * zSize,
      `Expected ${xSize * zSize} offset array, got ${tilesData.length}`
    );

    this.#tilesData = tilesData;
  }

  get xSize() {
    return this.#xSize;
  }

  get ySize() {
    return this.#ySize;
  }

  get zSize() {
    return this.#zSize;
  }

  get tilesData() {
    return this.#tilesData;
  }
}
