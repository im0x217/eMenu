import { describe, it, expect, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth';

describe('useAuthStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('formats phone canonically in setSession and persists session fields', () => {
    const auth = useAuthStore();

    auth.setSession('  محمد الليبي  ', '٠٩١١٠٠٢٢٣٣', 'jwt-token-1', true);

    expect(auth.customerName).toBe('محمد الليبي');
    expect(auth.customerPhone).toBe('091-1002233');
    expect(auth.customerToken).toBe('jwt-token-1');
    expect(auth.hasPassword).toBe(true);

    expect(localStorage.getItem('customer_name')).toBe('محمد الليبي');
    expect(localStorage.getItem('customer_phone')).toBe('091-1002233');
    expect(localStorage.getItem('customer_token')).toBe('jwt-token-1');
    expect(localStorage.getItem('customer_has_password')).toBe('true');

    auth.setSession('محمد', '+218921234567', 'jwt-token-2', false);
    expect(auth.customerPhone).toBe('092-1234567');
    expect(auth.hasPassword).toBe(false);
  });

  it('clears memory state and localStorage keys in clearIdentity', () => {
    const auth = useAuthStore();
    auth.setSession('أحمد', '0911002233', 'tok-clear', true);
    auth.showSetPasswordModal = true;

    auth.clearIdentity();

    expect(auth.customerName).toBe('');
    expect(auth.customerPhone).toBe('');
    expect(auth.customerToken).toBe('');
    expect(auth.hasPassword).toBe(false);
    expect(auth.showSetPasswordModal).toBe(false);
    expect(localStorage.getItem('customer_name')).toBeNull();
    expect(localStorage.getItem('customer_phone')).toBeNull();
    expect(localStorage.getItem('customer_token')).toBeNull();
    expect(localStorage.getItem('customer_has_password')).toBeNull();
  });

  it('computes isIdentified, isLoggedIn, and getAuthHeaders accurately', () => {
    const auth = useAuthStore();
    expect(auth.isIdentified()).toBe(false);
    expect(auth.isLoggedIn).toBe(false);
    expect(auth.getAuthHeaders()).toEqual({});

    auth.setSession('خالد', '0911002233', '', false);
    expect(auth.isIdentified()).toBe(true);
    expect(auth.isLoggedIn).toBe(false);
    expect(auth.getAuthHeaders()).toEqual({});

    auth.setSession('خالد', '0911002233', 'bearer-abc', false);
    expect(auth.isIdentified()).toBe(true);
    expect(auth.isLoggedIn).toBe(true);
    expect(auth.getAuthHeaders()).toEqual({ Authorization: 'Bearer bearer-abc' });

    auth.clearIdentity();
    auth.setSession('', '0911002233', '', true);
    expect(auth.isIdentified()).toBe(false);
    expect(auth.isLoggedIn).toBe(true);
  });

  it('handles login requiring password setup without granting a token session', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requiresPasswordSetup: true,
        customer: { name: 'علي', phone: '091-2223344' }
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    const auth = useAuthStore();
    const result = await auth.login('0912223344', '');

    expect(fetchSpy).toHaveBeenCalledWith('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0912223344', password: '' })
    });
    expect(result).toEqual({
      requiresPasswordSetup: true,
      customer: { name: 'علي', phone: '091-2223344' }
    });
    expect(auth.customerName).toBe('علي');
    expect(auth.customerPhone).toBe('091-2223344');
    expect(auth.hasPassword).toBe(false);
    expect(auth.customerToken).toBe('');
    expect(auth.showSetPasswordModal).toBe(true);
    expect(auth.isLoggedIn).toBe(false);
  });

  it('sets canonical token session on successful login and throws on error response', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'tok-login-99',
          customer: { name: 'طارق', phone: '+218923334455' }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'كلمة المرور غير صحيحة' })
      });
    vi.stubGlobal('fetch', fetchSpy);

    const auth = useAuthStore();
    const res = await auth.login('0923334455', 'secret123');

    expect(res).toEqual({
      success: true,
      customer: { name: 'طارق', phone: '+218923334455' }
    });
    expect(auth.customerPhone).toBe('092-3334455');
    expect(auth.customerToken).toBe('tok-login-99');
    expect(auth.hasPassword).toBe(true);
    expect(auth.isLoggedIn).toBe(true);
    expect(auth.getAuthHeaders()).toEqual({ Authorization: 'Bearer tok-login-99' });

    await expect(auth.login('0923334455', 'wrong')).rejects.toThrow('كلمة المرور غير صحيحة');
  });
});
