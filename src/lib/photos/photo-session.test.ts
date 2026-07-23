import { describe, expect, it } from 'vitest';
import {
  isSessionPhotoOwned,
  readSessionPhotoIds,
  registerSessionPhotoId,
  removeSessionPhotoId,
} from './photo-session';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('photo-session', () => {
  const routeSlug = 'pantalla';
  const photoId = '8ac30000-1111-4444-a222-333333333333';

  it('guarda y lee ids por sesion', () => {
    const storage = new MemoryStorage();
    registerSessionPhotoId(routeSlug, photoId, storage);
    expect(readSessionPhotoIds(routeSlug, storage)).toEqual([photoId]);
    expect(isSessionPhotoOwned(routeSlug, photoId, storage)).toBe(true);
  });

  it('elimina ids por sesion', () => {
    const storage = new MemoryStorage();
    registerSessionPhotoId(routeSlug, photoId, storage);
    removeSessionPhotoId(routeSlug, photoId, storage);
    expect(readSessionPhotoIds(routeSlug, storage)).toEqual([]);
  });
});
