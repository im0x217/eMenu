import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { useFavoritesStore } from '@/stores/favorites';
import { useAuthStore } from '@/stores/auth';

describe('useFavoritesStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('isolates shop1 and shop2 favorites independently', async () => {
    const favorites = useFavoritesStore();

    favorites.toggleFavorite('shop1', 'prod-100');
    expect(favorites.isFavorite('shop1', 'prod-100')).toBe(true);
    expect(favorites.isFavorite('shop2', 'prod-100')).toBe(false);
    expect(favorites.getFavoritesList('shop1')).toEqual(['prod-100']);
    expect(favorites.getFavoritesList('shop2')).toEqual([]);

    favorites.toggleFavorite('shop2', 'prod-200');
    expect(favorites.isFavorite('shop2', 'prod-200')).toBe(true);
    expect(favorites.isFavorite('shop1', 'prod-200')).toBe(false);

    await nextTick();
    expect(JSON.parse(localStorage.getItem('favorites_shop1'))).toEqual(['prod-100']);
    expect(JSON.parse(localStorage.getItem('favorites_shop2'))).toEqual(['prod-200']);
  });

  it('toggles items on and off and persists changes to localStorage', async () => {
    const favorites = useFavoritesStore();

    favorites.toggleFavorite('shop1', 'item-1');
    favorites.toggleFavorite('shop1', 'item-2');
    expect(favorites.isFavorite('shop1', 'item-1')).toBe(true);
    expect(favorites.isFavorite('shop1', 'item-2')).toBe(true);

    favorites.toggleFavorite('shop1', 'item-1');
    expect(favorites.isFavorite('shop1', 'item-1')).toBe(false);
    expect(favorites.getFavoritesList('shop1')).toEqual(['item-2']);

    await nextTick();
    expect(JSON.parse(localStorage.getItem('favorites_shop1'))).toEqual(['item-2']);
  });

  it('skips backend fetch when customer is not identified', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const favorites = useFavoritesStore();
    await favorites.loadFavoritesFromBackend();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads and applies server favorites for both shops via loadFavoritesFromBackend', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shop1: ['s1-a', 's1-b'],
        shop2: ['s2-x']
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    const auth = useAuthStore();
    auth.setSession('سالم', '0911002233', 'tok-fav-1', true);

    const favorites = useFavoritesStore();
    favorites.toggleFavorite('shop1', 'stale-local-id');

    await favorites.loadFavoritesFromBackend();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/customer/favorites?phone=091-1002233');
    expect(options.headers).toEqual({ Authorization: 'Bearer tok-fav-1' });

    expect(favorites.getFavoritesList('shop1')).toEqual(['s1-a', 's1-b']);
    expect(favorites.getFavoritesList('shop2')).toEqual(['s2-x']);
    expect(favorites.isFavorite('shop1', 'stale-local-id')).toBe(false);

    await nextTick();
    expect(JSON.parse(localStorage.getItem('favorites_shop1'))).toEqual(['s1-a', 's1-b']);
    expect(JSON.parse(localStorage.getItem('favorites_shop2'))).toEqual(['s2-x']);
  });
});
