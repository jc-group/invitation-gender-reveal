import { normalizePhotoId } from './photo-session';

export function parseOwnedPhotoIdsHeader(value: string | null): Set<string> {
  if (!value) return new Set();

  const values = value
    .split(',')
    .map((item) => normalizePhotoId(item))
    .filter(Boolean) as string[];

  return new Set(values);
}

export function isOwnedPhotoInHeader(photoId: string, value: string | null): boolean {
  const normalized = normalizePhotoId(photoId);
  if (!normalized) return false;
  return parseOwnedPhotoIdsHeader(value).has(normalized);
}
