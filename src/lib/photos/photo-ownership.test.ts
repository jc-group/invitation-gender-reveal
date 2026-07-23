import { describe, expect, it } from 'vitest';
import { isOwnedPhotoInHeader, parseOwnedPhotoIdsHeader } from './photo-ownership';

describe('photo-ownership', () => {
  const id = '8ac30000-1111-4444-a222-333333333333';
  const other = '8ac30000-1111-4444-a222-444444444444';

  it('permite update/delete solo para ids propios', () => {
    const header = `${id},${other}`;
    expect(isOwnedPhotoInHeader(id, header)).toBe(true);
    expect(isOwnedPhotoInHeader('8ac30000-1111-4444-a222-555555555555', header)).toBe(false);
  });

  it('parsea header de ids', () => {
    const parsed = parseOwnedPhotoIdsHeader(`${id},invalido`);
    expect(parsed.has(id)).toBe(true);
    expect(parsed.size).toBe(1);
  });
});
