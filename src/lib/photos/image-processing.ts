import type { ProcessedImage } from './photo-types';

const WEBP_MIME_TYPE = 'image/webp' as const;

function resizeByLongestSide(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }

  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function toWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, WEBP_MIME_TYPE, quality);
  });

  if (!blob || blob.type !== WEBP_MIME_TYPE) {
    throw new Error('Tu navegador no pudo exportar la imagen en formato WEBP.');
  }

  return blob;
}

function drawImageOnCanvas(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  width: number,
  height: number,
) {
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('No se pudo preparar el procesamiento de la imagen.');
  }

  context.drawImage(image, 0, 0, width, height);
}

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

async function decodeWithImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('createImageBitmap no esta disponible.');
  }

  return createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
}

async function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };

    image.src = objectUrl;
  });
}

async function decodeImageSource(file: File): Promise<CanvasImageSource & { width: number; height: number; close?: () => void }> {
  try {
    return await decodeWithImageBitmap(file);
  } catch {
    return decodeWithImageElement(file);
  }
}

function isHeicLike(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  let imageSource: (CanvasImageSource & { width: number; height: number; close?: () => void }) | null = null;

  try {
    imageSource = await decodeImageSource(file);
  } catch (error) {
    if (isHeicLike(file)) {
      throw new Error('No pudimos procesar HEIC/HEIF en este navegador. Convierte la imagen o usa JPG/PNG.');
    }

    throw error;
  }

  try {
    const originalDimensions = resizeByLongestSide(imageSource.width, imageSource.height, 2000);
    const thumbnailDimensions = resizeByLongestSide(imageSource.width, imageSource.height, 500);

    const originalCanvas = createCanvas();
    drawImageOnCanvas(
      originalCanvas,
      imageSource,
      originalDimensions.width,
      originalDimensions.height,
    );

    const thumbnailCanvas = createCanvas();
    drawImageOnCanvas(
      thumbnailCanvas,
      imageSource,
      thumbnailDimensions.width,
      thumbnailDimensions.height,
    );

    const originalBlob = await toWebpBlob(originalCanvas, 0.82);
    const thumbnailBlob = await toWebpBlob(thumbnailCanvas, 0.7);

    return {
      originalBlob,
      thumbnailBlob,
      width: originalDimensions.width,
      height: originalDimensions.height,
      mimeType: WEBP_MIME_TYPE,
      sizeBytes: originalBlob.size,
    };
  } finally {
    imageSource.close?.();
  }
}
