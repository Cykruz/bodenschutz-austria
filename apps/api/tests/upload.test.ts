import { describe, expect, it } from 'vitest';
import { sniffImage, stripJpegMetadata } from '../src/upload.js';

function jpegWith(segments: { marker: number; payload: Buffer }[]): Buffer {
  const parts: Buffer[] = [Buffer.from([0xff, 0xd8])];
  for (const s of segments) {
    const len = Buffer.alloc(2);
    len.writeUInt16BE(s.payload.length + 2);
    parts.push(Buffer.from([0xff, s.marker]), len, s.payload);
  }
  parts.push(Buffer.from([0xff, 0xda, 0x00, 0x02]), Buffer.from('scan-daten'), Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}

describe('Upload-Prüfung', () => {
  it('erkennt JPEG, PNG, WebP per Magic Bytes und lehnt anderes ab', () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImage(Buffer.from('89504e470d0a1a0a', 'hex'))).toBe('image/png');
    expect(sniffImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('image/webp');
    expect(sniffImage(Buffer.from('GIF89a'))).toBeNull();
    expect(sniffImage(Buffer.from('%PDF-1.4'))).toBeNull();
  });

  it('entfernt APP1 (EXIF) und APP13, behält APP0 und Bilddaten', () => {
    const exif = Buffer.concat([Buffer.from('Exif\0\0'), Buffer.from('GPS-Koordinaten-hier')]);
    const input = jpegWith([
      { marker: 0xe0, payload: Buffer.from('JFIF\0') },
      { marker: 0xe1, payload: exif },
      { marker: 0xed, payload: Buffer.from('Photoshop 3.0') },
      { marker: 0xdb, payload: Buffer.alloc(4, 1) },
    ]);
    const out = stripJpegMetadata(input);
    expect(out.length).toBeLessThan(input.length);
    expect(out.includes(Buffer.from('GPS-Koordinaten-hier'))).toBe(false);
    expect(out.includes(Buffer.from('Photoshop'))).toBe(false);
    expect(out.includes(Buffer.from('JFIF'))).toBe(true);
    expect(out.includes(Buffer.from('scan-daten'))).toBe(true);
    expect(sniffImage(out)).toBe('image/jpeg');
    expect(out.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  it('gibt bei kaputter Struktur das Original zurück', () => {
    const broken = Buffer.from([0xff, 0xd8, 0x00, 0x11, 0x22]);
    expect(stripJpegMetadata(broken)).toBe(broken);
  });
});
