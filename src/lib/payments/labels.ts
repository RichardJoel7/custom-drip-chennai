/** How Cashfree names a payment method, for people: "upi" → "UPI", "credit_card" → "Credit card". */
export function paymentMethodLabel(group: string | null | undefined) {
  if (!group) return null;
  if (group.startsWith("upi")) return "UPI";
  const words = group.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
