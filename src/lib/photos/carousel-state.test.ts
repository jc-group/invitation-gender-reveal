import { describe, expect, it } from 'vitest';
import {
  getCarouselUiState,
  nextCarouselIndex,
  previousCarouselIndex,
  reconcileCarouselIndex,
} from './carousel-state';

describe('carousel-state', () => {
  it('calcula estado vacio, unico y multiple', () => {
    expect(getCarouselUiState(0).isEmpty).toBe(true);
    expect(getCarouselUiState(1).hasSingleItem).toBe(true);
    expect(getCarouselUiState(3).canNavigate).toBe(true);
  });

  it('navega next y previous', () => {
    expect(nextCarouselIndex(0, 3)).toBe(1);
    expect(previousCarouselIndex(0, 3)).toBe(2);
  });

  it('reconcilia indice con id actual', () => {
    const photos = [
      { id: 'a', thumbnailUrl: '', imageUrl: '', guestName: '', message: '', createdAt: '' },
      { id: 'b', thumbnailUrl: '', imageUrl: '', guestName: '', message: '', createdAt: '' },
    ];

    expect(reconcileCarouselIndex('b', photos, 0)).toBe(1);
    expect(reconcileCarouselIndex('x', photos, 1)).toBe(1);
  });
});
