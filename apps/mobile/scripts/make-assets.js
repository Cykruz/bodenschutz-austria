#!/usr/bin/env node
/**
 * Erzeugt Icon, Adaptive-Icon, Splash und Favicon als PNG in den Markenfarben
 * mit einem „BA“-Platzhalter-Logo. Keine nativen Abhängigkeiten (nur pngjs).
 * Aufruf: node scripts/make-assets.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const GREEN = [0x1e, 0x3a, 0x2f];
const ACCENT = [0xf0, 0xa8, 0x5a];
const SAND = [0xf6, 0xf3, 0xec];

// 5x7-Pixelschrift für B und A
const GLYPHS = {
  B: ['1111.', '1...1', '1...1', '1111.', '1...1', '1...1', '1111.'],
  A: ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
};

function createCanvas(size, bg) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    png.data[i * 4] = bg ? bg[0] : 0;
    png.data[i * 4 + 1] = bg ? bg[1] : 0;
    png.data[i * 4 + 2] = bg ? bg[2] : 0;
    png.data[i * 4 + 3] = bg ? 255 : 0;
  }
  return png;
}

function setPixel(png, x, y, rgb) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i] = rgb[0];
  png.data[i + 1] = rgb[1];
  png.data[i + 2] = rgb[2];
  png.data[i + 3] = 255;
}

function fillRect(png, x0, y0, w, h, rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPixel(png, x, y, rgb);
}

function fillRoundedRect(png, x0, y0, w, h, r, rgb) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = x < x0 + r ? x0 + r - x : x > x0 + w - 1 - r ? x - (x0 + w - 1 - r) : 0;
      const dy = y < y0 + r ? y0 + r - y : y > y0 + h - 1 - r ? y - (y0 + h - 1 - r) : 0;
      if (dx * dx + dy * dy <= r * r) setPixel(png, x, y, rgb);
    }
  }
}

function drawText(png, text, cx, cy, cell, rgb) {
  const gap = cell; // Abstand zwischen Buchstaben
  const totalW = text.length * 5 * cell + (text.length - 1) * gap;
  let x = Math.round(cx - totalW / 2);
  const y = Math.round(cy - (7 * cell) / 2);
  for (const ch of text) {
    const g = GLYPHS[ch];
    g.forEach((row, ry) => {
      [...row].forEach((c, rx) => {
        if (c === '1') fillRect(png, x + rx * cell, y + ry * cell, cell, cell, rgb);
      });
    });
    x += 5 * cell + gap;
  }
}

function drawLogo(png, size, { withPlate = true } = {}) {
  const cell = Math.max(1, Math.round(size / 24));
  if (withPlate) {
    // stilisierte Bodenschutzplatte: Akzentbalken unter dem Schriftzug
    const barH = Math.round(size * 0.07);
    fillRoundedRect(
      png,
      Math.round(size * 0.22),
      Math.round(size * 0.7),
      Math.round(size * 0.56),
      barH,
      Math.round(barH / 2),
      ACCENT
    );
  }
  drawText(png, 'BA', size / 2, size * 0.47, cell, SAND);
}

function write(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log('geschrieben:', path.relative(process.cwd(), file));
}

const out = path.join(__dirname, '..', 'assets', 'images');
fs.mkdirSync(out, { recursive: true });

// App-Icon 1024x1024
{
  const s = 1024;
  const png = createCanvas(s, GREEN);
  drawLogo(png, s);
  write(path.join(out, 'icon.png'), png);
}
// Android Adaptive Icon: Vordergrund (transparent, Logo in der sicheren Zone), Hintergrund, Monochrom
{
  const s = 1024;
  const fg = createCanvas(s, null);
  const inner = createCanvas(Math.round(s * 0.6), null);
  drawLogo(inner, inner.width);
  const off = Math.round((s - inner.width) / 2);
  for (let y = 0; y < inner.height; y++)
    for (let x = 0; x < inner.width; x++) {
      const i = (inner.width * y + x) * 4;
      if (inner.data[i + 3] > 0) setPixel(fg, x + off, y + off, [inner.data[i], inner.data[i + 1], inner.data[i + 2]]);
    }
  write(path.join(out, 'android-icon-foreground.png'), fg);
  write(path.join(out, 'android-icon-background.png'), createCanvas(s, GREEN));
  const mono = createCanvas(s, null);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const i = (s * y + x) * 4;
      if (fg.data[i + 3] > 0) setPixel(mono, x, y, [255, 255, 255]);
    }
  write(path.join(out, 'android-icon-monochrome.png'), mono);
}
// Splash-Bild (transparent, Logo in Sand/Akzent auf dunkelgrünem Hintergrund per app.json)
{
  const s = 512;
  const png = createCanvas(s, null);
  fillRoundedRect(png, 0, 0, s, s, Math.round(s * 0.22), GREEN);
  drawLogo(png, s);
  write(path.join(out, 'splash-icon.png'), png);
}
// Favicon 48x48
{
  const s = 48;
  const png = createCanvas(s, GREEN);
  drawLogo(png, s, { withPlate: false });
  write(path.join(out, 'favicon.png'), png);
}
