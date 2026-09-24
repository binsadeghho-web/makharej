/**
 * Solar Hijri (Jalali / شمسی) Calendar Utility
 * Robust astronomical conversion between Gregorian and Solar Hijri calendars.
 */

export interface ShamsiDate {
  year: number;
  month: number; // 1 - 12
  day: number;   // 1 - 31
  monthName: string;
  dayOfWeekName: string;
  formatted: string; // e.g. "۱۴۰۵/۰۱/۰۴"
  fullFormatted: string; // e.g. "۴ فروردین ۱۴۰۵"
  timeFormatted: string; // e.g. "۱۴:۳۵"
}

export const SHAMSI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const WEEK_DAYS_PERSIAN = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
] as const;

/**
 * Converts English digits (0-9) to Persian digits (۰-۹)
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Converts Persian digits to English digits
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Format currency with commas and Persian digits
 */
export function formatMoney(amount: number | string, unit = 'تومان'): string {
  const num = typeof amount === 'string' ? parseFloat(toEnglishDigits(amount)) || 0 : amount;
  const parts = Math.round(num).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = toPersianDigits(parts.join('.'));
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format standard ASCII digits with commas (ideal for input fields without breaking mobile numeric keypads)
 */
export function formatNumberWithCommas(input: string | number): string {
  if (input === null || input === undefined || input === '') return '';
  const clean = toEnglishDigits(String(input)).replace(/[^0-9]/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Convert number into fluent Persian words (e.g. 25000000 -> بیست و پنج میلیون)
 */
export function numberToPersianWords(input: number | string): string {
  if (input === null || input === undefined || input === '') return '';
  const cleanStr = toEnglishDigits(String(input)).replace(/[^0-9]/g, '');
  const num = parseInt(cleanStr, 10);
  if (isNaN(num) || num <= 0) return '';

  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertThreeDigits(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const parts: string[] = [];

    if (h > 0) parts.push(hundreds[h]);

    if (remainder >= 10 && remainder < 20) {
      parts.push(teens[remainder - 10]);
    } else {
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      if (t > 0) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }

    return parts.join(' و ');
  }

  let temp = num;
  const chunks: string[] = [];
  let scaleIndex = 0;

  while (temp > 0 && scaleIndex < scales.length) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const word = convertThreeDigits(chunk);
      if (scales[scaleIndex]) {
        chunks.unshift(`${word} ${scales[scaleIndex]}`);
      } else {
        chunks.unshift(word);
      }
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  return chunks.join(' و ');
}

/**
 * Gregorian to Jalali (Solar Hijri) algorithm
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return [jy, jm, jd];
}

/**
 * Jalali to Gregorian algorithm
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }

  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  const gd = days + 1;

  return [gy, gm, gd];
}

/**
 * Get current Shamsi date and time
 */
export function getCurrentShamsiDate(dateInput: Date = new Date()): ShamsiDate {
  const gy = dateInput.getFullYear();
  const gm = dateInput.getMonth() + 1;
  const gd = dateInput.getDate();
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

  const hours = String(dateInput.getHours()).padStart(2, '0');
  const minutes = String(dateInput.getMinutes()).padStart(2, '0');
  const timeFormatted = `${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;

  const mPadded = String(jm).padStart(2, '0');
  const dPadded = String(jd).padStart(2, '0');
  const formatted = `${toPersianDigits(jy)}/${toPersianDigits(mPadded)}/${toPersianDigits(dPadded)}`;
  const monthName = SHAMSI_MONTH_NAMES[jm - 1];
  const dayOfWeekName = WEEK_DAYS_PERSIAN[dateInput.getDay()];
  const fullFormatted = `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;

  return {
    year: jy,
    month: jm,
    day: jd,
    monthName,
    dayOfWeekName,
    formatted,
    fullFormatted,
    timeFormatted,
  };
}

/**
 * Returns formatted month title, e.g. "مهر ۱۴۰۵"
 */
export function getShamsiMonthTitle(year: number, month: number): string {
  const mName = SHAMSI_MONTH_NAMES[(month - 1) % 12] || '';
  return `${mName} ${toPersianDigits(year)}`;
}

/**
 * Generate next Shamsi month
 */
export function getNextShamsiMonth(year: number, month: number): { year: number; month: number } {
  if (month >= 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Generate previous Shamsi month
 */
export function getPrevShamsiMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}
