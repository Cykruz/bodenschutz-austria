import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { paths } from './env.js';
import { badRequest } from './errors.js';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const EXT: Record<ImageMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Erkennt den Bildtyp anhand der Magic Bytes; null wenn kein erlaubtes Format. */
export function sniffImage(buf: Buffer): ImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/**
 * Entfernt Metadaten-Segmente (APP1 = EXIF/XMP, APP13 = IPTC) aus einer JPEG-Datei.
 * Einfacher Segment-Parser: Alles bis zum Start-of-Scan wird segmentweise geprüft,
 * der Rest (Bilddaten) unverändert übernommen. Bei unerwarteter Struktur wird das
 * Original zurückgegeben, damit kein Bild zerstört wird.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (sniffImage(buf) !== 'image/jpeg') return buf;
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff) return buf; // kein Marker: Struktur unbekannt
    const marker = buf[pos + 1];
    if (marker === undefined) return buf;
    if (marker === 0xff) {
      pos += 1; // Füllbyte
      continue;
    }
    if (marker === 0xda) {
      // Start of Scan: Rest unverändert anhängen
      parts.push(buf.subarray(pos));
      return Buffer.concat(parts);
    }
    if (marker === 0xd9) {
      parts.push(buf.subarray(pos, pos + 2));
      return Buffer.concat(parts);
    }
    const segLen = buf.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > buf.length) return buf;
    const isMetadata = marker === 0xe1 || marker === 0xed; // APP1, APP13
    if (!isMetadata) parts.push(buf.subarray(pos, pos + 2 + segLen));
    pos += 2 + segLen;
  }
  return buf;
}

export interface StoredPhoto {
  photoId: string;
  fileName: string;
  mime: ImageMime;
  bytes: number;
}

/** Prüft MIME + Magic Bytes, entfernt JPEG-Metadaten und speichert unter zufälligem Namen. */
export async function validateAndStorePhoto(buf: Buffer, declaredMime: string | undefined): Promise<StoredPhoto> {
  if (buf.length === 0) throw badRequest('Leere Datei');
  if (buf.length > MAX_UPLOAD_BYTES) throw badRequest('Datei größer als 8 MB');
  const sniffed = sniffImage(buf);
  if (!sniffed) throw badRequest('Nur JPEG, PNG oder WebP erlaubt');
  const declared = (declaredMime ?? '').toLowerCase().split(';')[0]?.trim();
  const accepted = new Set<string>([sniffed, sniffed === 'image/jpeg' ? 'image/jpg' : sniffed]);
  if (declared && declared !== 'application/octet-stream' && !accepted.has(declared)) {
    throw badRequest('Dateityp passt nicht zum Inhalt');
  }
  const data = sniffed === 'image/jpeg' ? stripJpegMetadata(buf) : buf;
  const photoId = randomUUID();
  const fileName = `${photoId}.${EXT[sniffed]}`;
  await fs.mkdir(paths.uploadsDir, { recursive: true });
  await fs.writeFile(path.join(paths.uploadsDir, fileName), data);
  return { photoId, fileName, mime: sniffed, bytes: data.length };
}

const PHOTO_ID_RE = /^[0-9a-f-]{36}$/i;

/** Findet die gespeicherte Datei zu einer photoId (ohne Pfad-Tricks). */
export async function findStoredPhoto(photoId: string): Promise<{ fileName: string; mime: ImageMime } | null> {
  if (!PHOTO_ID_RE.test(photoId)) return null;
  for (const mime of Object.keys(EXT) as ImageMime[]) {
    const fileName = `${photoId}.${EXT[mime]}`;
    try {
      await fs.access(path.join(paths.uploadsDir, fileName));
      return { fileName, mime };
    } catch {
      // weiter suchen
    }
  }
  return null;
}

export function mimeForFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

/** Analyse-Ergebnis als Sidecar-Datei neben dem Bild ablegen/lesen (überlebt Neustarts). */
export async function writePhotoSidecar(photoId: string, data: unknown): Promise<void> {
  await fs.writeFile(path.join(paths.uploadsDir, `${photoId}.json`), JSON.stringify(data), 'utf8');
}

export async function readPhotoSidecar(photoId: string): Promise<unknown | null> {
  if (!PHOTO_ID_RE.test(photoId)) return null;
  try {
    const text = await fs.readFile(path.join(paths.uploadsDir, `${photoId}.json`), 'utf8');
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
