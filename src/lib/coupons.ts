// Shared coupon eligibility checks, used by both the "Aplicar" preview
// (/api/coupons/validate) and the authoritative re-check at quote submission
// (/api/quotes POST) -- keeping one source of truth so a coupon can't be
// accepted at preview time but silently honored differently at submit time.

interface CouponLike {
  id: string;
  code: string;
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usageCount: number;
  oncePerCustomer: boolean;
}

// Bounds-check a coupon's own definition, not a specific redemption --
// used when an OWNER creates or edits a coupon. Only the app enforces this
// today (no DB-level CHECK constraint), so it's the one place standing
// between a typo and a coupon that pays customers to order.
export function validateDiscountValue(
  discountType: string,
  discountValue: number
): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: 'O valor do desconto deve ser maior que zero.' };
  }
  if (discountType === 'PERCENT' && discountValue > 100) {
    return { ok: false, error: 'O desconto percentual não pode passar de 100%.' };
  }
  return { ok: true };
}

export function checkCouponEligibility(
  coupon: CouponLike | null,
  alreadyUsedByCustomer: boolean
): { ok: true } | { ok: false; error: string } {
  if (!coupon || !coupon.active) {
    return { ok: false, error: 'Cupom inválido ou não encontrado.' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { ok: false, error: 'Esse cupom já expirou.' };
  }
  if (coupon.maxUses !== null && coupon.usageCount >= coupon.maxUses) {
    return { ok: false, error: 'Esse cupom já atingiu o limite de usos.' };
  }
  if (coupon.oncePerCustomer && alreadyUsedByCustomer) {
    return { ok: false, error: 'Você já usou este cupom antes -- ele vale só uma vez por cliente.' };
  }
  return { ok: true };
}
