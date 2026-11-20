'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  convertArabicDigits,
  formatCanonicalLibyanPhone,
  getLibyanPhoneVariants,
  normalizeArabicUsername,
  normalizeArabicText,
} = require('../src/domain/phone');

test('convertArabicDigits converts Arabic-Indic and Eastern Arabic numerals cleanly', () => {
  assert.equal(convertArabicDigits('٠٩١١٢٣٤٥٦٧'), '0911234567');
  assert.equal(convertArabicDigits('۰۹۲۹۸۷۶۵۴۳'), '0929876543');
  assert.equal(convertArabicDigits('طلب #١٠٥ - السعر 25.5'), 'طلب #105 - السعر 25.5');
  assert.equal(convertArabicDigits(null), '');
  assert.equal(convertArabicDigits(undefined), '');
});

test('formatCanonicalLibyanPhone normalizes all Libyan phone representations to 09x-xxxxxxx', () => {
  assert.equal(formatCanonicalLibyanPhone('0911234567'), '091-1234567');
  assert.equal(formatCanonicalLibyanPhone('911234567'), '091-1234567');
  assert.equal(formatCanonicalLibyanPhone('+218 91 123 4567'), '091-1234567');
  assert.equal(formatCanonicalLibyanPhone('00218921234567'), '092-1234567');
  assert.equal(formatCanonicalLibyanPhone('218947654321'), '094-7654321');
  assert.equal(formatCanonicalLibyanPhone('٠٩١-١٢٣٤٥٦٧'), '091-1234567');
  assert.equal(formatCanonicalLibyanPhone(''), '');
});

test('getLibyanPhoneVariants generates deduplicated canonical and legacy formats', () => {
  const variants = getLibyanPhoneVariants('٠٩١١٢٣٤٥٦٧');
  for (const expected of [
    '091-1234567',
    '0911234567',
    '911234567',
    '218911234567',
    '+218911234567',
    '00218911234567',
  ]) {
    assert.ok(variants.includes(expected), `expected variant ${expected}`);
  }
  assert.equal(new Set(variants).size, variants.length);
  assert.deepEqual(getLibyanPhoneVariants(''), []);
});

test('normalizeArabicUsername and normalizeArabicText fold hamza, ta-marbuta, alif-maqsura, tashkeel, and symbols', () => {
  assert.equal(normalizeArabicUsername('  أحمد   مُحَمَّد  '), 'احمد مُحَمَّد');
  assert.equal(normalizeArabicUsername('إدارة الساحة الكبرى'), 'اداره الساحه الكبري');
  assert.equal(normalizeArabicUsername(''), '');

  assert.equal(
    normalizeArabicText('بَقْلَاوَةٌ فـاخِرَة — (١ كجم)!'),
    'بقلاوه فاخره ١ كجم'
  );
  assert.equal(
    normalizeArabicText('إسوارة   شوكولاتة  آل زروق'),
    normalizeArabicText('اسواره شوكولاته ال زروق')
  );
  assert.equal(normalizeArabicText(null), '');
});
