/**
 * Normalizes a phone to the full international digits-only format wa.me
 * requires (e.g. 593998808926) — country code, no "+", no spaces, dashes, or
 * leading trunk "0". Customers are stored in the local Ecuadorian mobile
 * format (e.g. 0998808926), which wa.me silently rejects: it keeps the
 * leading 0, fails to resolve a chat, and drops the user on WhatsApp's
 * generic landing/gateway page instead of the intended conversation.
 * Mirrors the backend's WhatsAppTemplateService.sanitizePhone so every
 * wa.me link in the app agrees on the same number.
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    return `593${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Direct wa.me deep link with a pre-filled, fully URL-encoded message —
 * opens the chat immediately with no intermediate Meta gateway screen, and
 * never mangles emoji/accents into "?" since the text is percent-encoded.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${sanitizeWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
}
