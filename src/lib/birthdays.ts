// How many days until a person's next birthday, counting only month/day --
// the birth year is irrelevant to "when do they turn a year older next".
// Replaces a same-calendar-month check, which misses a birthday landing
// just after the month rolls over and keeps showing one from days ago in
// the current month as if it were still "coming up".
export function daysUntilNextBirthday(birthDate: Date, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (next < today) {
    next = new Date(now.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((next.getTime() - today.getTime()) / msPerDay);
}

export function isBirthdayWithinDays(birthDate: Date, windowDays: number, now: Date = new Date()): boolean {
  const distance = daysUntilNextBirthday(birthDate, now);
  return distance >= 0 && distance <= windowDays;
}
