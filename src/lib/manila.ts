import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { startOfDay, parseISO } from "date-fns";

export const MANILA_TZ = "Asia/Manila";

export function nowUtc(): Date {
  return new Date();
}

export function toManila(date: Date): Date {
  return toZonedTime(date, MANILA_TZ);
}

export function manilaDateString(date: Date = nowUtc()): string {
  return formatInTimeZone(date, MANILA_TZ, "yyyy-MM-dd");
}

export function manilaDateOnly(date: Date = nowUtc()): Date {
  const s = manilaDateString(date);
  return parseISO(s);
}

/** Parse "HH:mm" on a given Manila calendar date into UTC Date */
export function manilaTimeOnDate(dateStr: string, hhmm: string): Date {
  return fromZonedTime(`${dateStr}T${hhmm}:00`, MANILA_TZ);
}

export function formatManilaDateTime(date: Date): string {
  return formatInTimeZone(date, MANILA_TZ, "yyyy-MM-dd HH:mm:ss");
}

export function formatManilaDate(date: Date): string {
  return formatInTimeZone(date, MANILA_TZ, "yyyy-MM-dd");
}

export function manilaWeekday(date: Date): number {
  // 0=Sun .. 6=Sat in Manila
  return Number(formatInTimeZone(date, MANILA_TZ, "i")) % 7;
  // date-fns-tz 'i' is ISO day 1-7 Mon-Sun — convert:
}

export function manilaDayOfWeek(date: Date): number {
  // Returns 0=Sunday .. 6=Saturday
  const iso = Number(formatInTimeZone(date, MANILA_TZ, "i")); // 1=Mon .. 7=Sun
  return iso === 7 ? 0 : iso;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

export { startOfDay };
