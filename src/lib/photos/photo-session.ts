const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getSessionPhotoStorageKey(routeSlug: string): string {
  return `guest_photo_ids:${routeSlug}`;
}

export function normalizePhotoId(value: string): string | null {
  const candidate = value.trim();
  if (!UUID_PATTERN.test(candidate)) return null;
  return candidate;
}

export function readSessionPhotoIds(routeSlug: string, storage?: StorageLike): string[] {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  const raw = targetStorage.getItem(getSessionPhotoStorageKey(routeSlug));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.map((item) => normalizePhotoId(String(item))).filter(Boolean))] as string[];
  } catch {
    return [];
  }
}

export function saveSessionPhotoIds(routeSlug: string, photoIds: string[], storage?: StorageLike): void {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;

  const normalized = [...new Set(photoIds.map((item) => normalizePhotoId(item)).filter(Boolean))] as string[];
  targetStorage.setItem(getSessionPhotoStorageKey(routeSlug), JSON.stringify(normalized));
}

export function registerSessionPhotoIds(
  routeSlug: string,
  photoIds: string[],
  storage?: StorageLike,
): string[] {
  const existing = readSessionPhotoIds(routeSlug, storage);
  const merged = [...new Set([...existing, ...photoIds])];
  saveSessionPhotoIds(routeSlug, merged, storage);
  return merged;
}

export function registerSessionPhotoId(routeSlug: string, photoId: string, storage?: StorageLike): string[] {
  return registerSessionPhotoIds(routeSlug, [photoId], storage);
}

export function removeSessionPhotoId(routeSlug: string, photoId: string, storage?: StorageLike): string[] {
  const existing = readSessionPhotoIds(routeSlug, storage);
  const normalized = normalizePhotoId(photoId);
  if (!normalized) return existing;

  const next = existing.filter((id) => id !== normalized);
  saveSessionPhotoIds(routeSlug, next, storage);
  return next;
}

export function isSessionPhotoOwned(routeSlug: string, photoId: string, storage?: StorageLike): boolean {
  const normalized = normalizePhotoId(photoId);
  if (!normalized) return false;
  return readSessionPhotoIds(routeSlug, storage).includes(normalized);
}

export function buildOwnedPhotoIdsHeader(routeSlug: string, storage?: StorageLike): string {
  return readSessionPhotoIds(routeSlug, storage).join(',');
}
