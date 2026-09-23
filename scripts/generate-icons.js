import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate an uncompressed PNG buffer
function createPng(size, primaryColor = [99, 102, 241, 255], accentColor = [255, 255, 255, 255]) {
  // Width and height
  const width = size;
  const height = size;

  // Raw pixel data: for each scanline: 1 filter byte (0) + width * 4 (RGBA) bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const radius = size / 2;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = size * 0.28;
  const ringInner = size * 0.38;
  const ringOuter = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background rounded squircle / circle
      if (dist <= radius) {
        // Center bullseye dot
        if (dist <= innerRadius) {
          rawData[pxOffset] = accentColor[0];
          rawData[pxOffset + 1] = accentColor[1];
          rawData[pxOffset + 2] = accentColor[2];
          rawData[pxOffset + 3] = accentColor[3];
        }
        // Focus ring
        else if (dist >= ringInner && dist <= ringOuter) {
          rawData[pxOffset] = accentColor[0];
          rawData[pxOffset + 1] = accentColor[1];
          rawData[pxOffset + 2] = accentColor[2];
          rawData[pxOffset + 3] = accentColor[3];
        }
        // Primary background fill
        else {
          // Subtle gradient based on y
          const grad = Math.floor(20 * (y / height));
          rawData[pxOffset] = Math.max(0, primaryColor[0] - grad);
          rawData[pxOffset + 1] = Math.max(0, primaryColor[1] - grad);
          rawData[pxOffset + 2] = primaryColor[2];
          rawData[pxOffset + 3] = primaryColor[3];
        }
      } else {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // Compress raw pixel data
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC-32 table and calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const outDir = path.resolve('apps/extension/public/icons');
fs.mkdirSync(outDir, { recursive: true });

[16, 32, 48, 128].forEach((size) => {
  const buf = createPng(size);
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${buf.length} bytes)`);
});
