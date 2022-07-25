/*
1 tile = 6 subtiles
hblk01.dat stores 256 tiles (1536 subtiles)
Subtiles can be reused across tiles
*/
export const NUM_TILES = 256;
export const NUM_SUBTILES_PER_TILE = 6;
export const NUM_SUBTILES = NUM_TILES * NUM_SUBTILES_PER_TILE;
export const OFFSET_ARRAY_LAST_OFFSET = 6144;
export const SUBTILE_WIDTH = 32;
export const SUBTILE_HEIGHT = 16;
export const BYTES_PER_ROW = 20;
export const BYTES_PER_SUBTILE = BYTES_PER_ROW * SUBTILE_HEIGHT;

// For now, optimized palettes for in-game use case
export const NUM_COLORS_INGAME = 16;

export const DATA_FOLDER = "data";
export const TILES_OUTPUT_FOLDER = "tiles";
