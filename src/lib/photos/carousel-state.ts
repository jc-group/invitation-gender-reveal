import type { GuestPhoto } from './photo-types';

export interface CarouselUiState {
  isEmpty: boolean;
  hasSingleItem: boolean;
  canNavigate: boolean;
}

export function getCarouselUiState(totalPhotos: number): CarouselUiState {
  const count = Math.max(0, Number(totalPhotos) || 0);
  return {
    isEmpty: count === 0,
    hasSingleItem: count === 1,
    canNavigate: count > 1,
  };
}

export function nextCarouselIndex(currentIndex: number, totalPhotos: number): number {
  const count = Math.max(0, Number(totalPhotos) || 0);
  if (count <= 1) return 0;
  return (currentIndex + 1) % count;
}

export function previousCarouselIndex(currentIndex: number, totalPhotos: number): number {
  const count = Math.max(0, Number(totalPhotos) || 0);
  if (count <= 1) return 0;
  return (currentIndex - 1 + count) % count;
}

export function reconcileCarouselIndex(
  currentPhotoId: string | null,
  photos: GuestPhoto[],
  fallbackIndex = 0,
): number {
  if (photos.length === 0) return 0;

  if (currentPhotoId) {
    const index = photos.findIndex((photo) => photo.id === currentPhotoId);
    if (index >= 0) return index;
  }

  return Math.min(Math.max(fallbackIndex, 0), photos.length - 1);
}
