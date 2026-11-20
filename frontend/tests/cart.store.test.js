import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCartStore } from '@/stores/cart';

describe('useCartStore', () => {
  it('adds items, merges duplicate IDs, and reports getItemQty', () => {
    const cart = useCartStore();
    const product = {
      _id: 'prod-1',
      name: 'مقروض بالتمر',
      price_regular: 15,
      price_bulk: 12
    };

    cart.addToCart(product, 'shop1', 'regular', 2, 'تغليف هدية');
    expect(cart.items).toHaveLength(1);
    expect(cart.getItemQty('prod-1')).toBe(2);
    expect(cart.items[0].itemNotes).toBe('تغليف هدية');

    cart.addToCart(product, 'shop1', 'regular', 3);
    expect(cart.items).toHaveLength(1);
    expect(cart.getItemQty('prod-1')).toBe(5);
    expect(cart.getItemQty('missing-id')).toBe(0);
  });

  it('enforces retail vs bulk isolation in shop1 while allowing mixed modes in shop2', () => {
    const cart = useCartStore();
    cart.addToCart({ _id: 's1-a', name: 'غريبة', price_regular: 20, price_bulk: 16 }, 'shop1', 'regular', 1);

    expect(() =>
      cart.addToCart({ _id: 's1-b', name: 'بسكويت', price_regular: 18, price_bulk: 14 }, 'shop1', 'bulk', 1)
    ).toThrow('لا يمكن خلط طلبات الجملة والمفرد في نفس السلة.');

    cart.clearCart();
    cart.addToCart({ _id: 's2-a', name: 'لوز', price_regular: 45, price_bulk: 38 }, 'shop2', 'regular', 1);
    cart.addToCart({ _id: 's2-b', name: 'فستق', price_regular: 65, price_bulk: 55 }, 'shop2', 'bulk', 1);
    expect(cart.items).toHaveLength(2);
    expect(cart.getShopType).toBe('shop2');
  });

  it('rejects mixing products from shop1 and shop2 in the same cart', () => {
    const cart = useCartStore();
    cart.addToCart({ _id: 's1-1', name: 'عبمبر', price_regular: 30 }, 'shop1', 'regular', 1);

    expect(() =>
      cart.addToCart({ _id: 's2-1', name: 'كاجو', price_regular: 50 }, 'shop2', 'regular', 1)
    ).toThrow('لا يمكن خلط منتجات من متجرين مختلفين في نفس السلة.');
  });

  it('calculates and rounds cartTotal accurately across regular and bulk modes', () => {
    const cart = useCartStore();
    cart.addToCart({ _id: 'r1', name: 'صنف 1', price_regular: 12.4, price_bulk: 10 }, 'shop1', 'regular', 2);
    cart.addToCart({ _id: 'r2', name: 'صنف 2', price_regular: 5.3, price_bulk: 4 }, 'shop1', 'regular', 1);
    // 12.4 * 2 + 5.3 = 30.1 -> Math.round(30.1) = 30
    expect(cart.cartTotal).toBe(30);

    cart.clearCart();
    cart.addToCart({ _id: 'b1', name: 'صنف جملة', price_regular: 20, price_bulk: 12.25 }, 'shop1', 'bulk', 2);
    // 12.25 * 2 = 24.5 -> Math.round(24.5) = 25
    expect(cart.cartTotal).toBe(25);
  });

  it('updates item quantity and removes item when updateQty sets qty <= 0', () => {
    const cart = useCartStore();
    cart.addToCart({ _id: 'p1', name: 'كعك', price_regular: 10 }, 'shop1', 'regular', 2);

    cart.updateQty('p1', 4);
    expect(cart.getItemQty('p1')).toBe(4);
    expect(cart.cartTotal).toBe(40);

    cart.updateQty('p1', 0);
    expect(cart.items).toHaveLength(0);
    expect(cart.getItemQty('p1')).toBe(0);
    expect(JSON.parse(localStorage.getItem('cart_items'))).toEqual([]);
  });

  it('persists cart state to localStorage and hydrates cleanly on store creation', () => {
    const cart = useCartStore();
    cart.addToCart({ _id: 'p99', name: 'بقلاوة', price_regular: 35 }, 'shop1', 'regular', 2);
    cart.orderNotes = 'التوصيل مساءً';
    cart.persist();

    const storedItems = JSON.parse(localStorage.getItem('cart_items'));
    expect(storedItems).toHaveLength(1);
    expect(storedItems[0]._id).toBe('p99');
    expect(storedItems[0].quantity).toBe(2);
    expect(localStorage.getItem('cart_notes')).toBe('التوصيل مساءً');

    // Simulate reload with a fresh Pinia instance reading from localStorage
    setActivePinia(createPinia());
    const rehydrated = useCartStore();
    expect(rehydrated.items).toHaveLength(1);
    expect(rehydrated.getItemQty('p99')).toBe(2);
    expect(rehydrated.orderNotes).toBe('التوصيل مساءً');
  });
});
