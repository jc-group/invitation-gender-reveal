import { describe, expect, it } from 'vitest';
import { rollbackUploadedObjects } from './upload-rollback';

describe('upload-rollback', () => {
  it('ok cuando remove no falla', async () => {
    const result = await rollbackUploadedObjects(
      async () => ({ error: null }),
      ['a.webp'],
    );

    expect(result.ok).toBe(true);
  });

  it('reporta error cuando remove falla', async () => {
    const result = await rollbackUploadedObjects(
      async () => ({ error: { message: 'fallo remove' } }),
      ['a.webp'],
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('fallo remove');
  });
});
