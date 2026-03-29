/**
 * VenuLoQ contact configuration.
 * Single source of truth for all support/WhatsApp numbers.
 * Update REACT_APP_SUPPORT_PHONE in .env when the final number is confirmed.
 */
const SUPPORT_PHONE = process.env.REACT_APP_SUPPORT_PHONE || '919876543210';

export const VENULOQ_SUPPORT = {
  phone: SUPPORT_PHONE,
  phoneFormatted: `+${SUPPORT_PHONE}`,
  telLink: `tel:+${SUPPORT_PHONE}`,
  whatsappLink: (message = '') =>
    `https://wa.me/${SUPPORT_PHONE}${message ? `?text=${encodeURIComponent(message)}` : ''}`,
};
