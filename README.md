# Syndicate Map Viewer

## Purpose

Make a map viewer for **Syndicate**, one of the best games ever made.

## Assumptions

- This repository and the tools have been used only from a Linux system, with the [Good Old Games version](https://www.gog.com/game/syndicate) of Syndicate, which comes with all files in uppercase. I run  the game via [DOSBOX](https://www.dosbox.com/), but there's no real need of that to use the tools.
- Readable over optimized code.

## Setup

- run `yarn install`
- Install Wine (to run command line tools)
- From `tools/bullfrog_utils_rnc.zip`, you'll need the file `dernc.exe` to uncompress `.DAT` files.
- From your game installation (`\SYNDICAT\DATA` subfolder inside it), copy the relevant files to this repository's `data` subfolder:
  - `HBLK01.DAT`
  - `HPAL01.DAT` to `HPAL05.DAT` (or the amount of palette files you wish to use for maps)
  - `MAP01.DAT` to `MAP94.DAT` (or the amount of maps you wish to export)
  - `HSPR-0.DAT` and `HSPR-0.TAB` (and/or `HSPR-1.DAT` and `HSPR-1.TAB`) for in-game sprites
  - `HPOINTER.DAT` and `HPOINTER.TAB` for cursor sprites
  - `MFNT-0.DAT` and `MFNT-0.TAB` for menu fonts
  - `MSPR-0.DAT` and `MSPR-0.TAB` for menu sprites
  - `MSELECT.PAL` for the menu palette

### Decompressing files

Usage is like:
```
wine dernc.exe <filename1> <filename2> ...
```
Note: overrides the original with the uncompressed version. Game will work without problems with the uncompressed version but just so that you're aware. That's why for safety this project uses its own folder and you must copy data files there.

Files that need decompressing before use: `HSPR-0.DAT`, `HSPR-0.TAB`, `MSELECT.PAL` (and any other RNC-compressed files you copy over).

## Usage

### tile-exporter.js

```bash
node exporters/tile-exporter.js
```

This tool extracts all tiles from `HBLK01.DAT` file (put it into `data` folder and de-RNC it) into `png` files under the `tiles` subfolder. It extracts one version of each tile per palette.

![Sample Tile Reader tiles](doc/tile-reader-screenshot.png)

### map-exporter.js

```bash
node exporters/map-exporter.js
```

**WIP**

This tool exports a `MAPxx.DAT` map file into a `png` file under the `maps` subfolder.

![MAP03 with HPAL01](doc/map-only-tiles-01.jpg)
![MAP03 with HPAL02](doc/map-only-tiles-02.jpg)

### sprite-exporter.js

```bash
node exporters/sprite-exporter.js
```

**WIP**

This tool extracts all sprites from any `.DAT`/`.TAB` file pairs found in the `data` folder into `png` files under `sprites/<sprite-set-name>/`. Supported sprite sets:

- `HSPR-*.DAT` / `HPOINTER.DAT`: in-game sprites, rendered with the first available `HPAL*.DAT` palette (16-color)
- `MFNT-0.DAT`: menu fonts, rendered with `MSELECT.PAL` (256-color)
- `MSPR-0.DAT`: menu sprites, rendered with `MSELECT.PAL` (256-color)

`MSELECT.PAL` must be present and decompressed; if it is missing or still RNC-compressed, menu sprite sets are skipped with a warning.

![In-game and main menu sprites with the correct palette](doc/sprites-screenshot.png)


## References

- This project would have never been possible without my initial inspiration, the great [FreeSynd file formats documentation](https://freesynd.sourceforge.io/ff.php), although some documentation is either outdated or incorrect.
- The [libsyndicate project](https://icculus.org/libsyndicate/) contains so many reverse engineered file formats that it is an invaluable source.

### Sprites Information

An schema I've drawn to understand how sprites entities and files combine:

```
┌───────────────┐
│               │
│  GameXX.DAT   │
│               │
└───────┬───────┘                 next frame
        │                          ┌───────┐
        │ anim & frame indexes     │       │
        │                          │       │
┌───────▼───────┐             ┌────▼───────┴───┐           ┌─────────────────┐       ┌──────────────────┐
│               │             │                │           │                 │       │                  │
│  Sprite Anim  ├────────────►│  Sprite Frame  ├──────────►│ Sprite Element  ├───────►  Sprite Element  │
│               │ frame index │                │  frames   │      TAB        │       │       data       │
└───────────────┘             └────────────────┘   list    └─────────────────┘       └──────────────────┘
```
