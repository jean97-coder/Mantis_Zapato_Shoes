export type DiscountType = 'FIXED' | 'PERCENT';

export function computeBudget(
  services: { price: number }[],
  discountType: DiscountType = 'FIXED',
  discountValue = 0
) {
  const subtotal = services.reduce((acc, s) => acc + s.price, 0);
  const discount =
    discountType === 'PERCENT'
      ? Math.min(subtotal, subtotal * (Math.max(0, discountValue) / 100))
      : Math.min(subtotal, Math.max(0, discountValue));
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, discountType, discountValue, taxes: 0, total };
}
