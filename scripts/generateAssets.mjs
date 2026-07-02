#!/usr/bin/env node
/**
 * Generate placeholder icon / adaptive-icon / splash / favicon PNGs.
 *
 * Pure Node — no image libraries. Writes each PNG by hand:
 *   PNG signature + IHDR + IDAT (zlib-deflated) + IEND, CRC32 per chunk.
 *
 * Design: dark synthwave background with a centered glowing cyan orb
 * (matches the in-game player) and a sprinkle of parallax stars.
 * The recipe intentionally mirrors what you see mid-run so the store
 * icon reads as the same product on first tap.
 *
 * Re-run any time. Files land in ./assets — commit them.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets');
mkdirSync(OUT_DIR, { recursive: true });

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n >>> 0;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
    t[n] = c;
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
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgb /* Buffer, w*h*3 */) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB (no alpha)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: None
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Pixel recipe ----------
const BG = [0x05, 0x06, 0x0f];
const ORB_INNER = [0xe5, 0xff, 0xfb];
const ORB_EDGE = [0x7d, 0xff, 0xf0];
const HIGHLIGHT = [0xff, 0xff, 0xff];

function generate({ width, height, orbRadiusFrac, orbCenter = [0.5, 0.5], starDensity = 1 / 2500, seed = 12345 }) {
  const buf = Buffer.alloc(width * height * 3);
  const cx = width * orbCenter[0];
  const cy = height * orbCenter[1];
  const orbR = Math.min(width, height) * orbRadiusFrac;
  const glowR = orbR * 2.2;
  // Fixed-seed LCG so re-runs produce identical PNGs (byte-stable in git).
  let s = seed >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const numStars = Math.floor(width * height * starDensity);
  const stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push({ x: Math.floor(rng() * width), y: Math.floor(rng() * height), b: 0.4 + rng() * 0.6 });
  }
  const hx = cx - orbR * 0.35;
  const hy = cy - orbR * 0.4;
  const hR = orbR * 0.25;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let r = BG[0], g = BG[1], b = BG[2];
      // Outer glow
      if (d < glowR) {
        const gt = 1 - Math.min(1, d / glowR);
        const w = gt * gt * 0.55;
        r = Math.round(r + (ORB_EDGE[0] - r) * w);
        g = Math.round(g + (ORB_EDGE[1] - g) * w);
        b = Math.round(b + (ORB_EDGE[2] - b) * w);
      }
      // Orb body
      if (d < orbR) {
        const t = d / orbR;
        r = Math.round(ORB_INNER[0] + (ORB_EDGE[0] - ORB_INNER[0]) * t);
        g = Math.round(ORB_INNER[1] + (ORB_EDGE[1] - ORB_INNER[1]) * t);
        b = Math.round(ORB_INNER[2] + (ORB_EDGE[2] - ORB_INNER[2]) * t);
      }
      // Highlight (upper-left of orb)
      const hd = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
      if (hd < hR) {
        const t = 1 - hd / hR;
        const w = 0.75 * t * t;
        r = Math.round(r + (HIGHLIGHT[0] - r) * w);
        g = Math.round(g + (HIGHLIGHT[1] - g) * w);
        b = Math.round(b + (HIGHLIGHT[2] - b) * w);
      }
      const idx = (y * width + x) * 3;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
    }
  }
  // Stars overlay — skip if inside the glow so they don't muddy the orb.
  for (const st of stars) {
    if (st.x < 0 || st.y < 0 || st.x >= width || st.y >= height) continue;
    const d = Math.sqrt((st.x - cx) ** 2 + (st.y - cy) ** 2);
    if (d < glowR * 0.75) continue;
    const idx = (st.y * width + st.x) * 3;
    const b8 = Math.round(220 * st.b);
    buf[idx] = Math.min(255, buf[idx] + b8);
    buf[idx + 1] = Math.min(255, buf[idx + 1] + b8);
    buf[idx + 2] = Math.min(255, buf[idx + 2] + b8);
    // Small 2px cross to make stars visible at low DPI.
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = st.x + ox;
      const ny = st.y + oy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const i2 = (ny * width + nx) * 3;
      const half = Math.round(b8 * 0.35);
      buf[i2] = Math.min(255, buf[i2] + half);
      buf[i2 + 1] = Math.min(255, buf[i2 + 1] + half);
      buf[i2 + 2] = Math.min(255, buf[i2 + 2] + half);
    }
  }
  return buf;
}

// ---------- Emit ----------
function write(name, width, height, opts) {
  const rgb = generate({ width, height, ...opts });
  const png = encodePng(width, height, rgb);
  const path = join(OUT_DIR, name);
  writeFileSync(path, png);
  const kb = (png.length / 1024).toFixed(1);
  console.log(`wrote ${name.padEnd(22)} ${width}×${height}  ${kb} KB`);
}

// Icon: orb centered, comfortable margin. Fills the tile.
write('icon.png', 1024, 1024, { orbRadiusFrac: 0.32 });
// Adaptive-icon foreground: Android crops to a mask & the safe zone is
// the middle 66%. Keep the orb smaller so it never gets clipped.
write('adaptive-icon.png', 1024, 1024, { orbRadiusFrac: 0.22 });
// Splash: taller canvas, orb sits slightly above center.
write('splash.png', 1284, 2778, { orbRadiusFrac: 0.16, orbCenter: [0.5, 0.42] });
// Favicon for web build.
write('favicon.png', 96, 96, { orbRadiusFrac: 0.36, starDensity: 0 });
console.log('done');
