'use strict';

/**
 * Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits to ASCII digits.
 * @param {string | number | null | undefined} str
 * @returns {string}
 */
function convertArabicDigits(str) {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

/**
 * Format any Libyan phone input into canonical `09x-xxxxxxx` display form when recognizable.
 * Falls back to trimmed converted input if non-standard.
 * @param {string | number | null | undefined} phone
 * @returns {string}
 */
function formatCanonicalLibyanPhone(phone) {
  if (!phone) return '';
  const converted = convertArabicDigits(phone).trim();
  let digits = converted.replace(/[^0-9]/g, '');
  if (!digits) return converted;

  if (digits.startsWith('00218')) digits = digits.slice(5);
  else if (digits.startsWith('218')) digits = digits.slice(3);

  if (digits.startsWith('9') && digits.length === 9) {
    digits = '0' + digits;
  }

  if (digits.startsWith('09') && digits.length >= 4) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}`;
  }
  return converted;
}

/**
 * Generate all historical/canonical Libyan phone representations for flexible DB lookups.
 * @param {string | number | null | undefined} phone
 * @returns {string[]}
 */
function getLibyanPhoneVariants(phone) {
  if (!phone) return [];
  const raw = phone.toString().trim();
  const converted = convertArabicDigits(raw).trim();
  const digits = converted.replace(/[^0-9]/g, '');
  const variants = new Set();

  if (raw) variants.add(raw);
  if (converted) variants.add(converted);
  if (digits) variants.add(digits);

  let d = digits;
  if (d.startsWith('00218')) d = d.slice(5);
  else if (d.startsWith('218')) d = d.slice(3);
  if (d.startsWith('9') && d.length === 9) d = '0' + d;

  if (d.startsWith('09') && d.length === 10) {
    const formatted = `${d.slice(0, 3)}-${d.slice(3)}`; // 09x-xxxxxxx
    const plain10 = d; // 09xxxxxxxx
    const plain9 = d.slice(1); // 9xxxxxxxx
    const intl218 = '218' + plain9; // 2189xxxxxxxx
    const intlPlus = '+218' + plain9; // +2189xxxxxxxx
    const intl00 = '00218' + plain9; // 002189xxxxxxxx

    variants.add(formatted);
    variants.add(plain10);
    variants.add(plain9);
    variants.add(intl218);
    variants.add(intlPlus);
    variants.add(intl00);
  } else if (d.length >= 7) {
    variants.add(d);
    if (d.startsWith('09') && d.length >= 4) {
      variants.add(`${d.slice(0, 3)}-${d.slice(3)}`);
    }
  }

  return [...variants].filter(Boolean);
}

/**
 * Normalize Arabic hamza/alef/ta-marbuta/alif-maqsura and spacing for forgiving username matching.
 * @param {string | null | undefined} str
 * @returns {string}
 */
function normalizeArabicUsername(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * Normalize Arabic product/catalog text (strip tashkeel, tatweel, normalize letters & punctuation).
 * @param {string | null | undefined} text
 * @returns {string}
 */
function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا') // normalize alifs
    .replace(/ة/g, 'ه') // normalize ta marbuta
    .replace(/ى/g, 'ي') // normalize alif maqsura
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // remove symbols/emojis/punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

module.exports = {
  convertArabicDigits,
  formatCanonicalLibyanPhone,
  getLibyanPhoneVariants,
  normalizeArabicUsername,
  normalizeArabicText,
};
