#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

import { isRncEncoded, decompressRnc } from "../readers/rnc-decompressor.js";

const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: node tools/rnc-decompress.js <file> [<file> ...]");
  process.exit(1);
}

for (const filePath of args) {
  const absPath = resolve(filePath);
  const buf = readFileSync(absPath);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);

  if (!isRncEncoded(data)) {
    console.log(`${absPath}: not RNC-compressed, skipping.`);
    continue;
  }

  const decompressed = decompressRnc(data);
  writeFileSync(absPath, decompressed);
  console.log(`${absPath}: decompressed ${data.length} → ${decompressed.length} bytes.`);
}
