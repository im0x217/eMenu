import { describe, it, expect } from 'vitest';
import {
  convertArabicDigits,
  formatLibyanPhone,
  cleanPhoneDigits,
  formatPhoneInput,
  formatLibyanWhatsappNumber,
  getLibyanWhatsAppUrl
} from '@/utils/phone';

describe('phone utilities', () => {
  describe('convertArabicDigits', () => {
    it('converts Arabic-Indic and Eastern Arabic numerals to ASCII digits', () => {
      expect(convertArabicDigits('٠٩١١٠٠٢٢٣٣')).toBe('0911002233');
      expect(convertArabicDigits('۰۹۲۵۵۵۱۲۳۴')).toBe('0925551234');
      expect(convertArabicDigits('هاتف: ٠٩١-234٥٦٧٨')).toBe('هاتف: 091-2345678');
    });

    it('handles numbers, empty strings, null, and undefined safely', () => {
      expect(convertArabicDigits(912345678)).toBe('912345678');
      expect(convertArabicDigits('')).toBe('');
      expect(convertArabicDigits(null)).toBe('');
      expect(convertArabicDigits(undefined)).toBe('');
    });
  });

  describe('formatLibyanPhone', () => {
    it('normalizes valid Libyan mobile inputs into canonical 09x-xxxxxxx format', () => {
      expect(formatLibyanPhone('0911002233')).toBe('091-1002233');
      expect(formatLibyanPhone('091-1002233')).toBe('091-1002233');
      expect(formatLibyanPhone('091 100 2233')).toBe('091-1002233');
      expect(formatLibyanPhone('٠٩١١٠٠٢٢٣٣')).toBe('091-1002233');
      expect(formatLibyanPhone('+218911002233')).toBe('091-1002233');
      expect(formatLibyanPhone('00218911002233')).toBe('091-1002233');
      expect(formatLibyanPhone('218921234567')).toBe('092-1234567');
      expect(formatLibyanPhone('911002233')).toBe('091-1002233');
      expect(formatLibyanPhone('٩١١٠٠٢٢٣٣')).toBe('091-1002233');
    });

    it('returns empty string for falsy input and raw fallback for non-mobile inputs', () => {
      expect(formatLibyanPhone('')).toBe('');
      expect(formatLibyanPhone(null)).toBe('');
      expect(formatLibyanPhone('  abc  ')).toBe('abc');
      expect(formatLibyanPhone('0211234567')).toBe('0211234567');
    });
  });

  describe('cleanPhoneDigits', () => {
    it('strips formatting and international prefixes into 10-digit local digits', () => {
      expect(cleanPhoneDigits('091-1002233')).toBe('0911002233');
      expect(cleanPhoneDigits('+218 91 100 2233')).toBe('0911002233');
      expect(cleanPhoneDigits('00218921234567')).toBe('0921234567');
      expect(cleanPhoneDigits('911002233')).toBe('0911002233');
      expect(cleanPhoneDigits('٠٩١-١٠٠٢٢٣٣')).toBe('0911002233');
      expect(cleanPhoneDigits('')).toBe('');
    });
  });

  describe('formatPhoneInput', () => {
    it('formats partial and pasted phone input dynamically up to 09x-xxxxxxx', () => {
      expect(formatPhoneInput('')).toBe('');
      expect(formatPhoneInput('---')).toBe('');
      expect(formatPhoneInput('091')).toBe('091');
      expect(formatPhoneInput('0911')).toBe('091-1');
      expect(formatPhoneInput('091100223399')).toBe('091-1002233');
      expect(formatPhoneInput('+218911002233')).toBe('091-1002233');
      expect(formatPhoneInput('00218921234567')).toBe('092-1234567');
      expect(formatPhoneInput('911002233')).toBe('091-1002233');
      expect(formatPhoneInput('٠٩١١٠٠٢٢٣٣')).toBe('091-1002233');
    });
  });

  describe('formatLibyanWhatsappNumber & getLibyanWhatsAppUrl', () => {
    it('normalizes Libyan phone numbers into international 218 format', () => {
      expect(formatLibyanWhatsappNumber('0912345678')).toBe('218912345678');
      expect(formatLibyanWhatsappNumber('091-2345678')).toBe('218912345678');
      expect(formatLibyanWhatsappNumber('912345678')).toBe('218912345678');
      expect(formatLibyanWhatsappNumber('+218912345678')).toBe('218912345678');
      expect(formatLibyanWhatsappNumber('00218912345678')).toBe('218912345678');
      expect(formatLibyanWhatsappNumber('٠٩٢-١٢٣٤٥٦٧')).toBe('218921234567');
      expect(formatLibyanWhatsappNumber('')).toBe('');
      expect(formatLibyanWhatsappNumber('---')).toBe('');
    });

    it('builds valid wa.me links and falls back to # when empty', () => {
      expect(getLibyanWhatsAppUrl('091-2345678')).toBe('https://wa.me/218912345678');
      expect(getLibyanWhatsAppUrl('091-2345678', 'مرحبا')).toBe(
        `https://wa.me/218912345678?text=${encodeURIComponent('مرحبا')}`
      );
      expect(getLibyanWhatsAppUrl('')).toBe('#');
    });
  });
});
