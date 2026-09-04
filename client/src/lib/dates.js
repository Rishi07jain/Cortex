/**
 * Calendar-day helpers for due dates.
 *
 * Everything here works on "date keys" - plain "YYYY-MM-DD" strings in the
 * user's *local* calendar, which is the same format the API stores.
 *
 * The temptation is to use Date objects throughout. Don't. A Date is an instant
 * in UTC, and "due Friday" isn't an instant. In Kolkata (UTC+5:30) the Date for
 * local midnight Friday is 18:30 UTC on Thursday, so any UTC-based comparison
 * puts half your tasks on the wrong day - and it only breaks for users east of
 * Greenwich, which is exactly the kind of bug that survives testing. Comparing
 * "2026-09-03" <= "2026-09-03" as strings has no timezone in it at all, and
 * string ordering on ISO dates is the same as chronological ordering.
 */

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Date -> "YYYY-MM-DD" using local calendar fields (never toISOString). */
export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today, in the user's own calendar. */
export function todayKey() {
  return toDateKey(new Date());
}

export function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "YYYY-MM-DD" -> local midnight Date. Returns null for anything malformed. */
export function fromDateKey(key) {
  if (!isDateKey(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  // Month is 0-indexed, and this constructor builds a *local* date - which is
  // the whole point. new Date("2026-09-03") would parse as UTC instead.
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days from today to `key`. Negative means overdue. null if unset. */
export function daysUntil(key, from = todayKey()) {
  const target = fromDateKey(key);
  const base = fromDateKey(from);
  if (!target || !base) return null;
  // Both are local midnight, so the difference is a whole number of days even
  // across a daylight-saving boundary once rounded.
  return Math.round((target - base) / 86400000);
}

/**
 * Is this due date relevant to today's work?
 *
 * Anything due today *or already overdue*. An overdue task doesn't stop
 * mattering at midnight - if anything it matters more - so hiding it from the
 * today view would be the one way to guarantee it never gets done.
 */
export function isDueToday(key, today = todayKey()) {
  return isDateKey(key) && key <= today;
}

/** '' | 'overdue' | 'today' | 'soon' | 'later' - drives the colour of the pill. */
export function dueStatus(key, today = todayKey()) {
  if (!isDateKey(key)) return '';
  if (key < today) return 'overdue';
  if (key === today) return 'today';
  const days = daysUntil(key, today);
  return days !== null && days <= 3 ? 'soon' : 'later';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Short human label for a pill: "Today", "2d late", "in 5d", "12 Sep". */
export function formatDueLabel(key, today = todayKey()) {
  const days = daysUntil(key, today);
  if (days === null) return '';

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return '1d late';
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days <= 6) return `in ${days}d`;

  const date = fromDateKey(key);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return sameYear
    ? `${date.getDate()} ${MONTHS[date.getMonth()]}`
    : `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Longer label for the inspector: "Friday, 12 Sep 2026". */
export function formatDueLong(key) {
  const date = fromDateKey(key);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Today shifted by n days, as a key. Used by the quick "+1 day" buttons. */
export function shiftDays(days, from = todayKey()) {
  const base = fromDateKey(from);
  if (!base) return '';
  base.setDate(base.getDate() + days);
  return toDateKey(base);
}
