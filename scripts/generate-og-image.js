#!/usr/bin/env node
// Generates a minimal OG image (1200x630) as PNG using pure Node.js
// No external dependencies required — writes raw PNG with zlib deflate
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1200, H = 630;
const buf = Buffer.alloc(W * H * 3);

// Colors
const BG = [10, 14, 26];       // #0A0E1A
const GOLD = [212, 168, 75];   // #d4a84b
const ACCENT = [194, 120, 42]; // #c2782a
const MUTED = [90, 96, 112];   // #5a6070
const SUBTLE = [21, 28, 46];   // #151c2e

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b;
}

function fillRect(x0, y0, w, h, col) {
  for (let y = y0; y < y0 + h && y < H; y++)
    for (let x = x0; x < x0 + w && x < W; x++)
      setPixel(x, y, col[0], col[1], col[2]);
}

function blendPixel(x, y, col, alpha) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i]   = Math.round(buf[i]   * (1 - alpha) + col[0] * alpha);
  buf[i+1] = Math.round(buf[i+1] * (1 - alpha) + col[1] * alpha);
  buf[i+2] = Math.round(buf[i+2] * (1 - alpha) + col[2] * alpha);
}

// 5x7 bitmap font (uppercase + digits + common punctuation)
const FONT_5x7 = {
  A:["01110","10001","10001","11111","10001","10001","10001"],
  B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01110","10001","10000","10000","10000","10001","01110"],
  D:["11100","10010","10001","10001","10001","10010","11100"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  F:["11111","10000","10000","11110","10000","10000","10000"],
  G:["01110","10001","10000","10111","10001","10001","01110"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"],
  J:["00111","00010","00010","00010","00010","10010","01100"],
  K:["10001","10010","10100","11000","10100","10010","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  N:["10001","11001","10101","10011","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  P:["11110","10001","10001","11110","10000","10000","10000"],
  Q:["01110","10001","10001","10001","10101","10010","01101"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
  U:["10001","10001","10001","10001","10001","10001","01110"],
  V:["10001","10001","10001","10001","01010","01010","00100"],
  W:["10001","10001","10001","10101","10101","10101","01010"],
  X:["10001","10001","01010","00100","01010","10001","10001"],
  Y:["10001","10001","01010","00100","00100","00100","00100"],
  Z:["11111","00001","00010","00100","01000","10000","11111"],
  " ":["00000","00000","00000","00000","00000","00000","00000"],
  ".":["00000","00000","00000","00000","00000","00000","00100"],
  ",":["00000","00000","00000","00000","00000","00100","01000"],
  "-":["00000","00000","00000","11111","00000","00000","00000"],
  ":":["00000","00100","00000","00000","00000","00100","00000"],
  "!":["00100","00100","00100","00100","00100","00000","00100"],
  "/":["00001","00010","00010","00100","01000","01000","10000"],
  "0":["01110","10001","10011","10101","11001","10001","01110"],
  "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00110","01000","10000","11111"],
  "3":["01110","10001","00001","00110","00001","10001","01110"],
  "4":["00010","00110","01010","10010","11111","00010","00010"],
  "5":["11111","10000","11110","00001","00001","10001","01110"],
  "6":["01110","10000","10000","11110","10001","10001","01110"],
  "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"],
  "9":["01110","10001","10001","01111","00001","00001","01110"],
};

// Lowercase mapped from uppercase
"abcdefghijklmnopqrstuvwxyz".split("").forEach((c, i) => {
  FONT_5x7[c] = FONT_5x7[String.fromCharCode(65 + i)];
});

function drawText(text, cx, cy, scale, col) {
  const charW = 6 * scale;
  const totalW = text.length * charW - scale;
  let startX = Math.round(cx - totalW / 2);
  for (const ch of text) {
    const glyph = FONT_5x7[ch];
    if (glyph) {
      for (let row = 0; row < 7; row++) {
        for (let col_i = 0; col_i < 5; col_i++) {
          if (glyph[row][col_i] === "1") {
            for (let dy = 0; dy < scale; dy++)
              for (let dx = 0; dx < scale; dx++)
                setPixel(startX + col_i * scale + dx, cy - 3.5 * scale + row * scale + dy, col[0], col[1], col[2]);
          }
        }
      }
    }
    startX += charW;
  }
}

function drawPill(cx, cy, text, scale, col) {
  const charW = 6 * scale;
  const textW = text.length * charW;
  const pw = textW + scale * 8;
  const ph = scale * 12;
  const x0 = Math.round(cx - pw / 2);
  const y0 = Math.round(cy - ph / 2);
  // Border rect (outline only)
  for (let x = x0; x < x0 + pw; x++) {
    blendPixel(x, y0, col, 0.5);
    blendPixel(x, y0 + 1, col, 0.3);
    blendPixel(x, y0 + ph - 1, col, 0.5);
    blendPixel(x, y0 + ph - 2, col, 0.3);
  }
  for (let y = y0; y < y0 + ph; y++) {
    blendPixel(x0, y, col, 0.5);
    blendPixel(x0 + 1, y, col, 0.3);
    blendPixel(x0 + pw - 1, y, col, 0.5);
    blendPixel(x0 + pw - 2, y, col, 0.3);
  }
  drawText(text, cx, cy, scale, col);
}

// --- Draw the image ---

// Background
fillRect(0, 0, W, H, BG);

// Gradient overlay (subtle lighter toward bottom-right)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = (x / W * 0.3 + y / H * 0.7) * 0.15;
    blendPixel(x, y, SUBTLE, t);
  }
}

// Top and bottom gold accent lines
fillRect(0, 0, W, 4, GOLD);
fillRect(0, H - 4, W, 4, GOLD);

// "MILCALC" - large centered text
drawText("MILCALC", W / 2, 210, 10, GOLD);

// Tagline
drawText("YOUR MILITARY RETIREMENT, FULLY DECODED.", W / 2, 320, 3, MUTED);

// Feature pills
const pills = ["PENSION", "VA DISABILITY", "STATE TAXES", "INCOME GAP"];
const pillSpacing = 270;
const pillStartX = W / 2 - (pills.length - 1) * pillSpacing / 2;
pills.forEach((p, i) => {
  drawPill(pillStartX + i * pillSpacing, 430, p, 3, ACCENT);
});

// Bottom text
drawText("FREE. OFFLINE. BUILT BY VETERANS.", W / 2, 540, 2, MUTED);

// --- Encode as PNG ---
function crc32(data) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// IDAT: filter byte (0) + row data
const rawRows = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  rawRows[y * (1 + W * 3)] = 0; // filter: none
  buf.copy(rawRows, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
}
const compressed = zlib.deflateSync(rawRows, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  pngChunk("IHDR", ihdr),
  pngChunk("IDAT", compressed),
  pngChunk("IEND", Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, "..", "public", "og-image.png");
fs.writeFileSync(outPath, png);
console.log(`Generated ${outPath} (${png.length} bytes, ${W}x${H})`);
