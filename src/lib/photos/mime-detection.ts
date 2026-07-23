export type DetectedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'
  | 'unknown';

function hasAsciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;

  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) {
      return false;
    }
  }

  return true;
}

function detectHeifFamily(bytes: Uint8Array): DetectedMimeType {
  if (bytes.length < 12 || !hasAsciiAt(bytes, 4, 'ftyp')) {
    return 'unknown';
  }

  const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();

  if (brand.startsWith('hei')) {
    return 'image/heic';
  }

  if (brand.startsWith('mif') || brand.startsWith('msf') || brand.startsWith('hev')) {
    return 'image/heif';
  }

  return 'unknown';
}

export function detectImageMimeType(bytes: Uint8Array): DetectedMimeType {
  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return 'image/png';
  }

  if (bytes.length >= 12 && hasAsciiAt(bytes, 0, 'RIFF') && hasAsciiAt(bytes, 8, 'WEBP')) {
    return 'image/webp';
  }

  return detectHeifFamily(bytes);
}
