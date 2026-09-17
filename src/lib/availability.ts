// Mirrors the disable logic in AvailabilityDatePicker.tsx exactly: a date is
// unavailable if it falls before "today + minLeadDays" (isPast there) or if
// it's in the confectioner's blockedDates list (isBlocked there). Kept as a
// pure function here so the AI assistant's tool and the date picker agree on
// the same rule without duplicating it.
export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: 'too_soon' | 'blocked' };

export function checkDateAvailability(
  dateStr: string,
  blockedDates: string[],
  minLeadDays: number,
  now: Date = new Date()
): AvailabilityResult {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const earliestAllowed = new Date(today);
  earliestAllowed.setDate(earliestAllowed.getDate() + minLeadDays);

  const target = new Date(`${dateStr}T00:00:00`);

  if (target < earliestAllowed) {
    return { available: false, reason: 'too_soon' };
  }
  if (blockedDates.includes(dateStr)) {
    return { available: false, reason: 'blocked' };
  }
  return { available: true };
}
