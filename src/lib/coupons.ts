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
