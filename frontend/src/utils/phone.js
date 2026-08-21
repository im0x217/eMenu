/**
 * Normalizes any Libyan phone number to international WhatsApp format (+218 / 218)
 * Handles customer inputs like:
 *   - '0912345678'   -> '218912345678'
 *   - '0921234567'   -> '218921234567'
 *   - '912345678'    -> '218912345678'
 *   - '+218912345678'-> '218912345678'
 *   - '00218912345678'-> '218912345678'
 *   - '091-234-5678' -> '218912345678'
 * 
 * @param {string|number} phone
 * @returns {string} Clean digits with country code 218
 */
export const formatLibyanWhatsappNumber = (phone) => {
  if (!phone) return '';
  // 1. Strip all non-digit characters (spaces, dashes, plus, parentheses)
  let clean = phone.toString().replace(/[^0-9]/g, '');
  
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
