// Shared retry wrapper for generating a per-tenant sequential business number
// (ORC-2026-0001, PED-2026-0001). The @@unique constraint on
// (organizationId, quoteNumber|orderNumber) always prevents an actual
// duplicate from being persisted -- but without this, two requests racing to
// claim the same next number make the loser fail with a bare P2002 that the
// route's generic catch turns into an unhelpful 500, for a perfectly
// legitimate concurrent request (two customers submitting a quote at once).
// This turns that failure into "regenerate the candidate number and try
// again" instead.
export async function withNumberRetry<T>(
  generateCandidate: () => Promise<string>,
  createWithNumber: (number: string) => Promise<T>,
  maxAttempts = 5,
  numberField: string = 'quoteNumber'
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const number = await generateCandidate();
    try {
      return await createWithNumber(number);
    } catch (error: any) {
      // Only retry when the P2002 is actually about the number colliding --
      // a violation on an unrelated unique field (e.g. Order.quoteId, when a
      // quote is converted twice) would never be fixed by trying a new
      // number, so let it fail immediately instead of burning attempts.
      const target = error?.meta?.target;
      const hitNumberConstraint =
        error?.code === 'P2002' &&
        (Array.isArray(target) ? target.includes(numberField) : target === numberField);
      if (hitNumberConstraint && attempt < maxAttempts - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Não foi possível gerar um número único após várias tentativas.');
}
