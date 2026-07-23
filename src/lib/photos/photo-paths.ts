const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PhotoStoragePaths {
  originalPath: string;
  thumbnailPath: string;
}

function assertUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} invalido.`);
  }

  return value;
}

export function buildPhotoStoragePaths(eventId: string, photoId: string): PhotoStoragePaths {
  const safeEventId = assertUuid(eventId, 'event_id');
  const safePhotoId = assertUuid(photoId, 'photo_id');

  return {
    originalPath: `${safeEventId}/originals/${safePhotoId}.webp`,
    thumbnailPath: `${safeEventId}/thumbnails/${safePhotoId}.webp`,
  };
}

export function isPathOwnedByEvent(path: string, eventId: string): boolean {
  const safeEventId = assertUuid(eventId, 'event_id');
  return path.startsWith(`${safeEventId}/`) && !path.includes('..');
}
