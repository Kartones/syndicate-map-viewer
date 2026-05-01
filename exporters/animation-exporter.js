import { mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

import { Jimp } from "jimp";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;

import {
  DATA_FOLDER,
  ANIMATIONS_OUTPUT_FOLDER,
  SPRITE_TAB_ENTRY_SIZE,
  GIF_FRAME_DELAY_MS,
} from "../constants.js";
import { readPalette } from "../readers/palette-reader.js";
import { readSpriteDat, readSpriteTab } from "../readers/sprite-reader.js";
import { readSpriteAnims, readSpriteFrames, readSpriteElements } from "../readers/ani-reader.js";
import { readSprite } from "../entities/sprite.js";

// ---- load data ----------------------------------------------------------------

const paletteFile = readdirSync(DATA_FOLDER)
  .filter((f) => f.startsWith("HPAL") && f.endsWith(".DAT"))
  .sort()[0];

if (!paletteFile) {
  throw new Error("No HPAL*.DAT palette file found in data/");
}

const palette  = readPalette(paletteFile);
const datContents = readSpriteDat("HSPR-0.DAT");
const tabEntries  = readSpriteTab("HSPR-0.TAB");
const anims       = readSpriteAnims   ("HSTA-0.ANI");
const frames      = readSpriteFrames  ("HFRA-0.ANI");
const elements    = readSpriteElements("HELE-0.ANI");

console.log(`Loaded: ${anims.length} animations, ${frames.length} frames, ${elements.length} elements, ${tabEntries.length} sprites`);

// ---- helpers ------------------------------------------------------------------

const collectAnimFrames = (firstFrameIdx) => {
  const visited = new Set();
  const result = [];
  let idx = firstFrameIdx;

  while (idx !== 0 && !visited.has(idx)) {
    visited.add(idx);
    const frame = frames[idx];
    if (!frame || frame.width === 0 || frame.height === 0) break;
    result.push({ idx, frame });
    idx = frame.next;
  }

  return result;
};

// Compute the canvas origin: the minimum x/y offset across all elements of a frame.
// Element offsets are relative to an anchor point, not the canvas top-left.
// Shifting by (minX, minY) maps that anchor to canvas (0, 0).
const computeOrigin = (firstElemIdx) => {
  let minX = Infinity;
  let minY = Infinity;
  let idx = firstElemIdx;
  while (idx !== 0) {
    const elem = elements[idx];
    if (!elem) break;
    if (elem.xOffset < minX) minX = elem.xOffset;
    if (elem.yOffset < minY) minY = elem.yOffset;
    idx = elem.next;
  }
  return { originX: isFinite(minX) ? minX : 0, originY: isFinite(minY) ? minY : 0 };
};

const compositeFrame = (frame, palette) => {
  const { width, height, first } = frame;
  const { originX, originY } = computeOrigin(first);
  const image = new Jimp({ width, height, color: 0x00000000 });

  let elemIdx = first;
  while (elemIdx !== 0) {
    const elem = elements[elemIdx];
    if (!elem) break;

    const { spriteTabIndex, xOffset, yOffset, flipped, next } = elem;
    const tabEntry = tabEntries[spriteTabIndex];

    if (tabEntry && tabEntry.width > 0 && tabEntry.height > 0) {
      const pixels = readSprite(tabEntry, datContents);

      for (let py = 0; py < tabEntry.height; py++) {
        for (let px = 0; px < tabEntry.width; px++) {
          const pixel = pixels[py * tabEntry.width + px];
          if (pixel.transparent) continue;

          const srcX = flipped ? tabEntry.width - 1 - px : px;
          const destX = xOffset - originX + srcX;
          const destY = yOffset - originY + py;

          if (destX >= 0 && destX < width && destY >= 0 && destY < height) {
            image.setPixelColor(palette[pixel.color], destX, destY);
          }
        }
      }
    }

    elemIdx = next;
  }

  return image;
};

// ---- export -------------------------------------------------------------------

let exportedAnims = 0;
let skippedAnims  = 0;

for (let animId = 0; animId < anims.length; animId++) {
  const animFrames = collectAnimFrames(anims[animId]);

  if (animFrames.length === 0) {
    skippedAnims++;
    continue;
  }

  const animFolder = join(ANIMATIONS_OUTPUT_FOLDER, `anim-${String(animId).padStart(4, "0")}`);
  mkdirSync(animFolder, { recursive: true });

  const composited = animFrames.map(({ frame }) => compositeFrame(frame, palette));

  await Promise.all(
    composited.map((image, frameNum) => {
      const outputPath = join(animFolder, `frame-${String(frameNum).padStart(3, "0")}.png`);
      return image.write(outputPath);
    })
  );

  // Build animated GIF from composited frames
  const { width, height } = animFrames[0].frame;
  const gif = GIFEncoder();
  for (const image of composited) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        const i = (y * width + x) * 4;
        rgba[i]     = (color >>> 24) & 0xff;
        rgba[i + 1] = (color >>> 16) & 0xff;
        rgba[i + 2] = (color >>> 8)  & 0xff;
        rgba[i + 3] =  color         & 0xff;
      }
    }
    const gifPalette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
    const index = applyPalette(rgba, gifPalette, "rgba4444");
    gif.writeFrame(index, width, height, {
      palette: gifPalette,
      delay: GIF_FRAME_DELAY_MS,
      transparent: true,
      transparentIndex: 0,
      repeat: 0,
    });
  }
  gif.finish();
  writeFileSync(join(animFolder, "anim.gif"), gif.bytes());

  exportedAnims++;
}

console.log(`Done. Exported ${exportedAnims} animations, skipped ${skippedAnims} empty.`);
