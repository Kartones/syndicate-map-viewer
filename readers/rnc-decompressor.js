import { readFileSync } from "fs";
import { join } from "path";

import { DATA_FOLDER } from "../constants.js";

const RNC_SIGNATURE = 0x524E4301; // "RNC\1" — bytes 0x52 0x4E 0x43 0x01 (big-endian)
const HEADER_SIZE = 18;

// CRC-16/ARC: poly 0xA001 (bit-reversed 0x8005), init=0, no final XOR
const CRC_TABLE = (() => {
  const t = new Uint16Array(256);
  for (let i = 0; i < 256; i++) {
    let v = i;
    for (let j = 0; j < 8; j++) v = (v & 1) ? (v >>> 1) ^ 0xA001 : v >>> 1;
    t[i] = v;
  }
  return t;
})();

export const computeCrc = (data, offset, length) => {
  let v = 0;
  for (let i = 0; i < length; i++) {
    v ^= data[offset + i];
    v = (v >>> 8) ^ CRC_TABLE[v & 0xFF];
  }
  return v & 0xFFFF;
};

// Bitstream: consumes bits LSB-first from a sequence of bytes.
// Maintains a 32-bit buffer with 16–31 valid bits (count tracks how many).
// New bytes are ORed in at position `count` (little-endian bit accumulation).
class Bitstream {
  constructor(data, offset, length) {
    this._data = data;
    this._pos = offset;
    this._end = offset + length;
    this._buf = 0;
    this._count = 0;
    this._reload(16);
  }

  // Load bytes into the high end of the buffer until count >= 16 (if count < 16).
  _reload(nb = 16) {
    if (nb <= 16 && this._count < 16) {
      while (nb > 0) {
        if (this._pos < this._end) {
          this._buf = (this._buf | (this._data[this._pos++] << this._count)) >>> 0;
        }
        this._count += 8;
        nb -= 8;
      }
    }
  }

  _pop(n) {
    if (n === 0) return 0;
    const mask = (1 << n) - 1;
    const result = this._buf & mask;
    this._buf = (this._buf >>> n) >>> 0;
    this._count -= n;
    return result;
  }

  readBits(n) {
    const result = this._pop(n);
    this._reload();
    return result;
  }

  // Copy n raw bytes into out[outPos..], handling partial-word alignment.
  readBytes(n, out, outPos) {
    // Save the sub-word bits that are not yet aligned to a 16-bit boundary.
    const extraBits = this._count % 16;
    const saved = this._pop(extraBits); // count is now a multiple of 16

    // Drain whole buffered bytes into output.
    while (this._count >= 8 && n > 0) {
      out[outPos++] = this._pop(8);
      n--;
    }

    // Copy remaining bytes directly from the data stream.
    while (n > 0 && this._pos < this._end) {
      out[outPos++] = this._data[this._pos++];
      n--;
    }

    // Refill buffer to exactly 16 bits.
    this._reload(16 - this._count);

    // Restore the saved sub-word bits at the low end so they are read next.
    if (extraBits > 0) {
      this._count += extraBits;
      this._buf = ((this._buf << extraBits) | (saved & ((1 << extraBits) - 1))) >>> 0;
    }
  }
}

class HuffNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }

  get isLeaf() {
    return this.left === null && this.right === null;
  }
}

// Build a Huffman tree by reading its descriptor from the bitstream.
// Format: 5 bits = number of leaves (maxVal), then 4 bits per leaf depth.
// Tree is assembled bottom-up: deeper nodes are paired into parents first.
const readHuffmanTable = (bs) => {
  const maxVal = bs.readBits(5);
  if (maxVal === 0) return null;

  const leafDepth = new Array(maxVal);
  let maxDepth = 1;
  for (let i = 0; i < maxVal; i++) {
    leafDepth[i] = bs.readBits(4);
    if (leafDepth[i] > maxDepth) maxDepth = leafDepth[i];
  }

  let pending = [];
  for (let depth = maxDepth; depth >= 0; depth--) {
    const nodes = [];

    if (depth > 0) {
      for (let val = 0; val < maxVal; val++) {
        if (leafDepth[val] === depth) nodes.push(new HuffNode(val));
      }
    }

    while (pending.length > 0) {
      const left = pending.shift();
      const right = pending.length > 0 ? pending.shift() : null;
      nodes.push(new HuffNode(0, left, right));
    }

    pending = nodes;
  }

  return pending[0] ?? null;
};

// Decode one value from the bitstream using a Huffman tree.
// Leaf values encode variable-length integers: val < 2 → direct; val >= 2 → read (val-1) extra bits.
const getHuffValue = (bs, root) => {
  if (!root) return 0;

  let node = root;
  while (!node.isLeaf) {
    const bit = bs.readBits(1);
    const next = bit === 0 ? node.left : node.right;
    if (!next) throw new Error("RNC: invalid Huffman code in stream");
    node = next;
  }

  const val = node.val;
  if (val < 2) return val;
  return (1 << (val - 1)) | bs.readBits(val - 1);
};

export const isRncEncoded = (data) => {
  if (data.length < HEADER_SIZE) return false;
  const sig = ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0;
  return sig === RNC_SIGNATURE;
};

export const decompressRnc = (data) => {
  if (!isRncEncoded(data)) return data;

  // Header is big-endian
  const unpackedLength = ((data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]) >>> 0;
  const packedLength   = ((data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11]) >>> 0;
  const unpackedCrc    = (data[12] << 8) | data[13];
  const packedCrc      = (data[14] << 8) | data[15];
  const packCount      = data[17];

  if (computeCrc(data, HEADER_SIZE, packedLength) !== packedCrc) {
    throw new Error("RNC: packed data CRC mismatch");
  }

  const output = new Uint8Array(unpackedLength);
  let outPos = 0;

  const bs = new Bitstream(data, HEADER_SIZE, packedLength);
  bs.readBits(2); // two unknown bits at the start of the bitstream

  for (let pack = 0; pack < packCount && outPos < unpackedLength; pack++) {
    const rawTable  = readHuffmanTable(bs);
    const distTable = readHuffmanTable(bs);
    const lenTable  = readHuffmanTable(bs);

    let chunks = bs.readBits(16);

    while (chunks > 0) {
      // Copy raw (literal) bytes
      const rawLen = getHuffValue(bs, rawTable);
      if (rawLen > 0) {
        bs.readBytes(rawLen, output, outPos);
        outPos += rawLen;
      }

      if (--chunks === 0) break;

      // Back-reference: copy `len` bytes from `dist` bytes before current position
      const dist = getHuffValue(bs, distTable) + 1;
      const len  = getHuffValue(bs, lenTable) + 2;
      for (let i = 0; i < len; i++) {
        output[outPos] = output[outPos - dist];
        outPos++;
      }
    }
  }

  if (computeCrc(output, 0, unpackedLength) !== unpackedCrc) {
    throw new Error("RNC: unpacked data CRC mismatch");
  }

  return output;
};

export const readRncFile = (filename) => {
  const buf = readFileSync(join(DATA_FOLDER, filename));
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return decompressRnc(data);
};
