const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from RGBA pixel data
function createPng(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth: 8
  ihdr.writeUInt8(6, 9); // color type: 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression: 0 (deflate)
  ihdr.writeUInt8(0, 11); // filter: 0
  ihdr.writeUInt8(0, 12); // interlace: 0

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter type 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0; // Filter type None
    rgbaBuffer.copy(
      scanlines,
      rowOffset + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw a stylized cyber-indigo swap/key icon
function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background squircle / rounded shield
      const nx = Math.abs(dx) / (size * 0.44);
      const ny = Math.abs(dy) / (size * 0.44);
      const squircle = Math.pow(nx, 3.5) + Math.pow(ny, 3.5);

      if (squircle <= 1.0) {
        // Gradient from Indigo-600 (#4f46e5) to Violet-500 (#8b5cf6) to Cyan-400 (#22d3ee)
        const t = (x + y) / (size * 2);
        const r = Math.round(79 * (1 - t) + 139 * t);
        const g = Math.round(70 * (1 - t) + 92 * t + 30 * (1 - Math.abs(0.5 - t)));
        const b = Math.round(229 * (1 - t) + 246 * t);

        // Anti-aliased border edge
        let alpha = 255;
        if (squircle > 0.85) {
          alpha = Math.round(255 * (1 - (squircle - 0.85) / 0.15));
        }

        // Draw double curved swap arrows in the center
        const angle = Math.atan2(dy, dx);
        const ringDist = Math.abs(dist - radius * 0.55);
        const isRing = ringDist < Math.max(1.5, size * 0.1);

        // Check if inside the arrow arc
        const inTopArc = isRing && (angle > -Math.PI * 0.8 && angle < -Math.PI * 0.1);
        const inBottomArc = isRing && (angle > Math.PI * 0.2 && angle < Math.PI * 0.9);

        // Center dot / key core
        const isCore = dist < Math.max(2, size * 0.14);

        if (inTopArc || inBottomArc || isCore) {
          // Pure white / bright cyan for inner glyph
          buf[idx] = 255;
          buf[idx + 1] = 255;
          buf[idx + 2] = 255;
          buf[idx + 3] = alpha;
        } else {
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = alpha;
        }
      } else {
        // Transparent outside
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      }
    }
  }

  return createPng(size, height = size, buf);
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const png = renderIcon(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: icon-${size}.png (${size}x${size})`);
});

console.log('All extension icons generated successfully!');
