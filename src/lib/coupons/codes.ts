/** Coupon codes are stored and compared in capitals: "drip10 " → "DRIP10". */
export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

/** 3–30 capital letters, digits, "-" or "_" (the database checks the same rule). */
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

/** Turns a database coupon error into words for the customer. */
export function couponErrorMessage(rawMessage: string): string | null {
  const minimum = rawMessage.match(/COUPON_MIN_ORDER:(\d+(?:\.\d+)?)/);
  if (minimum) return `This coupon is for orders of ₹${Math.round(Number(minimum[1])).toLocaleString("en-IN")} or more.`;
  if (rawMessage.includes("COUPON_USED_UP")) return "This coupon has already been used up.";
  if (rawMessage.includes("COUPON_ALREADY_USED")) return "You've already used this coupon.";
  if (rawMessage.includes("INVALID_COUPON")) return "That coupon code isn't valid or has expired.";
  return null;
}
