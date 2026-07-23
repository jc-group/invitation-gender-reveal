import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_FILE_BYTES,
  validateUploadFile,
  validateUploadSelection,
} from './photo-validation';

function makeFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('photo-validation', () => {
  it('acepta formatos permitidos', () => {
    const file = makeFile('foto.jpg', 1024, 'image/jpeg');
    const result = validateUploadFile(file);
    expect(result.valid).toBe(true);
  });

  it('rechaza formato invalido', () => {
    const file = makeFile('documento.pdf', 1024, 'application/pdf');
    const result = validateUploadFile(file);
    expect(result.valid).toBe(false);
  });

  it('rechaza archivo mayor a 15mb', () => {
    const file = makeFile('foto.webp', MAX_UPLOAD_FILE_BYTES + 1, 'image/webp');
    const result = validateUploadFile(file);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('15 MB');
  });

  it('rechaza seleccion cuando supera maximo de archivos', () => {
    const files = Array.from({ length: 2 }, (_, index) =>
      makeFile(`foto-${index}.jpg`, 1024, 'image/jpeg'),
    );
    const result = validateUploadSelection(files, 9);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
  });
});
