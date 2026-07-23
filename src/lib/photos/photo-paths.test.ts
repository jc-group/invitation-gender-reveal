import { describe, expect, it } from 'vitest';
import { buildPhotoStoragePaths, isPathOwnedByEvent } from './photo-paths';

describe('photo-paths', () => {
  const eventId = 'cb3f9352-1dde-4088-a889-da03eafcaaa9';
  const photoId = '8ac30000-1111-4444-a222-333333333333';

  it('genera rutas de storage correctas', () => {
    const paths = buildPhotoStoragePaths(eventId, photoId);
    expect(paths.originalPath).toBe(`${eventId}/originals/${photoId}.webp`);
    expect(paths.thumbnailPath).toBe(`${eventId}/thumbnails/${photoId}.webp`);
  });

  it('valida ownership por event_id', () => {
    expect(isPathOwnedByEvent(`${eventId}/originals/${photoId}.webp`, eventId)).toBe(true);
    expect(isPathOwnedByEvent(`otro-evento/originals/${photoId}.webp`, eventId)).toBe(false);
  });
});
