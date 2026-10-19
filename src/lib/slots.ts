/**
 * «Свободные слоты» (Figma 215:333 / 215:319, category «Логика»).
 *
 * - Numbers are not tied to a CRM: they are generated, re-rolled once a day (seed = Moscow date),
 *   so a reload never makes them jump, and the next day they differ.
 * - The window is 5 weeks starting with the current calendar week (Mon–Sun, Moscow time) and moves
 *   every Monday at 00:00 MSK.
 * - Applications for a week close on the Friday 23:59 MSK before it starts. Weeks whose deadline has
 *   passed are «Занято»; the first open one is the nearest start.
 * - Ranges by order: nearest 1–3, next 3–5, the one after 6–9, the rest «Свободно»; the order
 *   nearest < next < third always holds.
 * - Within a week the nearest slot only goes down (a running minimum of the daily rolls).
 * - Manual override: ISO week keys in `busy` are «Занято» and skipped by the generation.
 */

const DAY = 86_400_000;
const MSK = 3 * 3_600_000; // Moscow has no DST since 2014

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export type SlotStatus = "busy" | "open" | "free";

export type Week = {
  /** ISO key, e.g. "2026-W44" */
  key: string;
  /** Monday 00:00 MSK as a UTC timestamp */
  start: number;
  status: SlotStatus;
  /** seats left for «open» weeks */
  seats: number | null;
  /** «Октябрь · 44 нед» */
  caption: string;
  /** «26–1» */
  range: string;
  /** «26 октября – 1 ноября» */
  full: string;
  /** «26 окт – 1 ноя» / «2–8 ноя» */
  short: string;
  /** «2 места» / «Свободно» / «Занято» */
  label: string;
};

export type SlotsState = {
  weeks: Week[];
  /** index of the nearest open week in `weeks` (-1 if none) */
  nearest: number;
  /** applications for the nearest week close at this UTC timestamp */
  deadline: number;
};

/** Moscow wall-clock fields for a UTC timestamp */
const msk = (t: number) => new Date(t + MSK);

/** Monday 00:00 MSK of the week containing `t` (UTC timestamp) */
export function weekStart(t: number) {
  const d = msk(t);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * DAY - MSK;
}

/** ISO 8601 week number and year of a Monday (MSK) */
export function isoWeek(monday: number) {
  const d = msk(monday + 3 * DAY); // Thursday decides the ISO year
  const year = d.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Dow = (new Date(jan4).getUTCDay() + 6) % 7;
  const week1 = jan4 - jan4Dow * DAY;
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { year, week: 1 + Math.floor((thursday - week1 - 3 * DAY) / (7 * DAY)) };
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
export const seatsLabel = (n: number) => `${n} ${plural(n, "место", "места", "мест")}`;

/* small deterministic PRNG: string seed → [0, 1) */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand(seed: string) {
  let a = hash(seed);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const roll = (seed: string, min: number, max: number) => min + Math.floor(rand(seed) * (max - min + 1));
const dateKey = (t: number) => msk(t).toISOString().slice(0, 10);

function describe(start: number) {
  const a = msk(start);
  const b = msk(start + 6 * DAY);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const { year, week } = isoWeek(start);
  const d1 = a.getUTCDate();
  const d2 = b.getUTCDate();
  return {
    key: `${year}-W${String(week).padStart(2, "0")}`,
    caption: `${MONTHS[a.getUTCMonth()]} · ${week} нед`,
    range: `${d1}–${d2}`,
    full: sameMonth
      ? `${d1}–${d2} ${MONTHS_GEN[b.getUTCMonth()]}`
      : `${d1} ${MONTHS_GEN[a.getUTCMonth()]} – ${d2} ${MONTHS_GEN[b.getUTCMonth()]}`,
    short: sameMonth
      ? `${d1}–${d2} ${MONTHS_SHORT[b.getUTCMonth()]}`
      : `${d1} ${MONTHS_SHORT[a.getUTCMonth()]} – ${d2} ${MONTHS_SHORT[b.getUTCMonth()]}`,
  };
}

/** Friday 23:59 MSK before the week that starts on `monday` — the end of that minute (23:59:59) */
export const deadlineFor = (monday: number) => monday - 2 * DAY - 1_000;

export function computeSlots(now: number, opts: { busy?: string[]; size?: number; salt?: string } = {}): SlotsState {
  const size = opts.size ?? 5;
  const busy = new Set(opts.busy ?? []);
  const salt = opts.salt ?? "kewate";
  const first = weekStart(now);
  const today = dateKey(now);
  const dayOfWeek = Math.floor((now - first) / DAY); // 0..6

  const weeks: Week[] = [];
  let order = 0; // 0 = nearest, 1 = next, 2 = third, 3+ = free
  let prev = 0;
  let nearestDeadline = 0;
  for (let i = 0; i < size; i++) {
    const start = first + i * 7 * DAY;
    const d = describe(start);
    const closed = now >= deadlineFor(start) || busy.has(d.key);
    let status: SlotStatus;
    let seats: number | null = null;
    if (closed) status = "busy";
    else if (order === 0) {
      // running minimum of the daily rolls since Monday → only ever goes down within the week
      let v = 3;
      for (let k = 0; k <= dayOfWeek; k++) v = Math.min(v, roll(`${salt}|${dateKey(first + k * DAY)}|${d.key}`, 1, 3));
      seats = v;
      status = "open";
      nearestDeadline = deadlineFor(start);
    } else if (order === 1) {
      seats = Math.max(prev + 1, roll(`${salt}|${today}|${d.key}`, 3, 5));
      status = "open";
    } else if (order === 2) {
      seats = Math.max(prev + 1, roll(`${salt}|${today}|${d.key}`, 6, 9));
      status = "open";
    } else status = "free";
    if (!closed) {
      order++;
      if (seats != null) prev = seats;
    }
    weeks.push({
      ...d,
      start,
      status,
      seats,
      label: status === "busy" ? "Занято" : status === "free" ? "Свободно" : seatsLabel(seats!),
    });
  }
  const nearest = weeks.findIndex((w) => w.status !== "busy");
  return { weeks, nearest, deadline: nearestDeadline || (nearest >= 0 ? deadlineFor(weeks[nearest].start) : now) };
}

/** {d, h, m} until the deadline, never negative */
export function countdown(now: number, deadline: number) {
  const left = Math.max(0, deadline - now);
  const m = Math.floor(left / 60_000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}
