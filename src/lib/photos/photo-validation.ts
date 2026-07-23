export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_GUEST_NAME_LENGTH = 80;
export const MAX_GUEST_MESSAGE_LENGTH = 240;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

type AllowedMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface ValidatedUploadFile {
  valid: boolean;
  message: string;
}

export interface UploadSelectionValidation {
  accepted: File[];
  rejected: Array<{ file: File; message: string }>;
  message: string;
}

export function isAllowedImageMimeType(mimeType: string): mimeType is AllowedMime {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return '';
  return filename.slice(dot).toLowerCase();
}

export function isAllowedImageExtension(filename: string): boolean {
  const extension = getFileExtension(filename);
  return ALLOWED_EXTENSIONS.has(extension);
}

export function validateUploadFile(file: Pick<File, 'name' | 'size' | 'type'>): ValidatedUploadFile {
  if (!file.size) {
    return { valid: false, message: 'El archivo esta vacio.' };
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return { valid: false, message: 'El archivo supera el limite de 15 MB.' };
  }

  if (!isAllowedImageExtension(file.name)) {
    return {
      valid: false,
      message: 'Formato invalido. Usa JPG, PNG, WEBP, HEIC o HEIF.',
    };
  }

  if (file.type && !isAllowedImageMimeType(file.type)) {
    return {
      valid: false,
      message: 'El tipo MIME no es valido para imagen.',
    };
  }

  return { valid: true, message: '' };
}

export function validateUploadSelection(
  files: File[],
  existingCount = 0,
): UploadSelectionValidation {
  if (existingCount + files.length > MAX_UPLOAD_FILES) {
    return {
      accepted: [],
      rejected: files.map((file) => ({
        file,
        message: `Solo puedes cargar hasta ${MAX_UPLOAD_FILES} fotos por intento.`,
      })),
      message: `Solo puedes cargar hasta ${MAX_UPLOAD_FILES} fotos por intento.`,
    };
  }

  const accepted: File[] = [];
  const rejected: Array<{ file: File; message: string }> = [];

  for (const file of files) {
    const validation = validateUploadFile(file);
    if (validation.valid) {
      accepted.push(file);
      continue;
    }

    rejected.push({ file, message: validation.message });
  }

  return {
    accepted,
    rejected,
    message: rejected.length > 0 ? 'Algunos archivos no son validos.' : '',
  };
}

export function sanitizeTextInput(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeGuestName(value: unknown): string {
  return sanitizeTextInput(value, MAX_GUEST_NAME_LENGTH);
}

export function sanitizeGuestMessage(value: unknown): string {
  return sanitizeTextInput(value, MAX_GUEST_MESSAGE_LENGTH);
}
