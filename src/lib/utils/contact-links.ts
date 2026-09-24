export const STORE_EMAIL = "customdripchennai@gmail.com";

const DEFAULT_WHATSAPP_MESSAGE =
  "Hi Custom Drip Chennai team!\nI'm interested in your T-shirts and have an enquiry regarding an order. Could you please help me?";

// Admins may type a bare 10-digit Indian number; wa.me and tel: both need the country code.
function toInternationalDigits(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function whatsappUrl(number: string, message = DEFAULT_WHATSAPP_MESSAGE) {
  return `https://wa.me/${toInternationalDigits(number)}?text=${encodeURIComponent(message)}`;
}

export function telUrl(number: string) {
  return `tel:+${toInternationalDigits(number)}`;
}

/** Opens a new email in the visitor's mail app, with the subject and body filled in. */
export function mailtoUrl(email: string, subject: string, body: string) {
  // encodeURIComponent, not URLSearchParams: mail apps show "+" literally instead of a space.
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
