/**
 * Libyan Phone Number Utilities
 * Standardizes phone numbers across e-Menu to the unified structure: 09x-xxxxxxx
 * (e.g., 091-1002233, 092-2003344)
 */

/**
 * Converts Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) numerals to standard ASCII digits (0-9).
 * 
 * @param {string|number} val
 * @returns {string} String with all digits normalized to 0-9
 */
export const convertArabicDigits = (val) => {
  if (val === null || val === undefined) return '';
  return val.toString()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
};

/**
 * Normalizes any Libyan phone number to standard unified display structure: 09x-xxxxxxx
 * Handles:
 *   - '0911002233'     -> '091-1002233'
 *   - '091-1002233'    -> '091-1002233'
 *   - '911002233'      -> '091-1002233'
 *   - '+218911002233'  -> '091-1002233'
 *   - '00218911002233' -> '091-1002233'
 *   - '218911002233'   -> '091-1002233'
 *   - '091 100 2233'   -> '091-1002233'
 *   - '٠٩١١٠٠٢٢٣٣'     -> '091-1002233'
 * 
 * @param {string|number} phone
 * @returns {string} Formatted phone (09x-xxxxxxx) or fallback
 */
export const formatLibyanPhone = (phone) => {
  if (!phone) return '';
  const raw = convertArabicDigits(phone).trim();
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return raw;

  // Strip international prefix
  if (digits.startsWith('00218')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('218')) {
    digits = digits.slice(3);
  }

  // If starts with 9 and has 9 digits, prepend 0 (e.g. 912345678 -> 0912345678)
  if (digits.startsWith('9') && digits.length === 9) {
    digits = '0' + digits;
  }

  // Libyan 10-digit mobile number: 09x + 7 digits
  if (digits.startsWith('09') && digits.length >= 4) {
    const prefix = digits.slice(0, 3);
    const suffix = digits.slice(3, 10);
    return `${prefix}-${suffix}`;
  }

  // If already exactly 10 digits starting with 09
  if (digits.length === 10 && digits.startsWith('09')) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return raw;
};

/**
 * Strips all formatting and normalizes to standard 10 clean digits (09xxxxxxxx)
 * 
 * @param {string|number} phone
 * @returns {string} 10-digit clean string or clean digits
 */
export const cleanPhoneDigits = (phone) => {
  if (!phone) return '';
  const converted = convertArabicDigits(phone);
  let digits = converted.toString().replace(/[^0-9]/g, '');
  if (digits.startsWith('00218')) digits = digits.slice(5);
  else if (digits.startsWith('218')) digits = digits.slice(3);
  if (digits.startsWith('9') && digits.length === 9) digits = '0' + digits;
  return digits;
};

/**
 * Real-time input masking helper for phone inputs.
 * Formats user input dynamically as 09x-xxxxxxx while typing or pasting.
 * 
 * @param {string} value
 * @returns {string} Formatted input string (max 11 chars: 09x-xxxxxxx)
 */
export const formatPhoneInput = (value) => {
  if (!value) return '';
  const converted = convertArabicDigits(value);
  let digits = converted.toString().replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Handle pasted international numbers (+218... or 00218...)
  if (digits.startsWith('00218')) digits = digits.slice(5);
  else if (digits.startsWith('218')) digits = digits.slice(3);

  // If user pasted a 9-digit number starting with 9
  if (digits.startsWith('9') && digits.length > 1) {
    digits = '0' + digits;
  }

  // Limit to max 10 digits
  digits = digits.slice(0, 10);

  // If 3 digits or fewer, return digits directly (e.g. "0", "09", "091")
  if (digits.length <= 3) {
    return digits;
  }

  // 4 or more digits: format as 09x-xxxxxxx
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

/**
 * Normalizes any Libyan phone number to international WhatsApp format (+218 / 218)
 * Handles customer inputs like:
 *   - '0912345678'   -> '218912345678'
 *   - '091-2345678'  -> '218912345678'
 *   - '0921234567'   -> '218921234567'
 *   - '912345678'    -> '218912345678'
 *   - '+218912345678'-> '218912345678'
 * 
 * @param {string|number} phone
 * @returns {string} Clean digits with country code 218
 */
export const formatLibyanWhatsappNumber = (phone) => {
  if (!phone) return '';
  const converted = convertArabicDigits(phone);
  // 1. Strip all non-digit characters (spaces, dashes, plus, parentheses)
  let clean = converted.toString().replace(/[^0-9]/g, '');
  
  if (!clean) return '';

  // 2. Remove leading double zeros '00' (e.g., 00218...)
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }
  
  // 3. If it already starts with 218:
  if (clean.startsWith('218')) {
    return clean;
  }
  
  // 4. If it starts with leading 0 (e.g. 091xxxxxxx, 092xxxxxxx):
  if (clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  
  // 5. Prepend 218 country code
  return '218' + clean;
};

/**
 * Returns full https://wa.me/ URL with normalized Libyan phone number
 * 
 * @param {string|number} phone
 * @param {string} message Optional prefilled message text
 * @returns {string}
 */
export const getLibyanWhatsAppUrl = (phone, message = '') => {
  const normalized = formatLibyanWhatsappNumber(phone);
  if (!normalized) return '#';
  return `https://wa.me/${normalized}` + (message ? `?text=${encodeURIComponent(message)}` : '');
};
