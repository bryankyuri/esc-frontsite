// Generates the Chord Pad PWA icons as real PNGs (no image deps).
// Draws a dark rounded chassis with a 2x2 pad grid, one pad amber — on brand
// with the instrument. Run: node scripts/gen-icons.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public");

const CASE = [19, 19, 23]; // #131317 chassis
const PAD = [42, 42, 50]; // #2a2a32 dark pad
const AMBER = [224, 154, 53]; // #e09a35

// ---- tiny PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- drawing ----
function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  const nearLeft = px < x + r;
  const nearRight = px >= x + w - r;
  const nearTop = py < y + r;
  const nearBottom = py >= y + h - r;
  if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
    const cx = nearLeft ? x + r : x + w - 1 - r;
    const cy = nearTop ? y + r : y + h - 1 - r;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  }
  return true;
}

function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = 255;
  };

  // chassis with rounded corners; outside corners stay transparent
  const chassisR = size * 0.22;
  // 2x2 pad grid inside a safe inset (maskable safe zone)
  const inset = size * 0.2;
  const gap = size * 0.06;
  const area = size - inset * 2;
  const cell = (area - gap) / 2;
  const padR = cell * 0.2;
  const amberCell = 1; // top-right

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRoundRect(x, y, 0, 0, size, size, chassisR)) continue; // transparent corner
      let color = CASE;
      for (let c = 0; c < 4; c++) {
        const col = c % 2;
        const row = (c / 2) | 0;
        const cx = inset + col * (cell + gap);
        const cy = inset + row * (cell + gap);
        if (inRoundRect(x, y, cx, cy, cell, cell, padR)) {
          color = c === amberCell ? AMBER : PAD;
          break;
        }
      }
      set(x, y, color);
    }
  }
  return buf;
}

for (const size of [192, 512, 180]) {
  const png = encodePNG(size, draw(size));
  const name = size === 180 ? "apple-touch-icon.png" : `pwa-${size}.png`;
  fs.writeFileSync(path.join(OUT, name), png);
  console.log("wrote", name, `${png.length} bytes`);
}
