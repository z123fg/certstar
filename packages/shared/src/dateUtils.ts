const CHINA_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" });
const CHINA_DATETIME_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/**
 * Parse a user-input date string to a normalized "yyyy-MM-dd" string.
 * Accepts: "yyyy-MM-dd", "yyyy/MM/dd", and variants without zero-padding.
 * Returns null if the value is empty, unparseable, or not a real calendar date.
 */
export const parseExpDate = (raw: unknown): string | null => {
  const s = String(raw ?? "").trim().replace(/\//g, "-").split("T")[0];
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || isNaN(year) || isNaN(month) || isNaN(day)) return null;
  // Validate the calendar date using UTC to avoid any timezone effects
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/**
 * Format any date/datetime value as "yyyy-MM-dd" in China timezone (Asia/Shanghai).
 * Use this for displaying expDate values that came from the database (full ISO timestamps).
 * Falls back to parseExpDate for plain date strings (e.g. from user input or CSV).
 */
export const toChineseDateString = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // Full ISO timestamp → convert to China local date
  if (s.includes("T") || s.endsWith("Z") || s.includes("+")) {
    try { return CHINA_DATE_FMT.format(new Date(s)); } catch { return ""; }
  }
  // Plain date string → normalize
  return parseExpDate(s) ?? s;
};

/**
 * Format any datetime value as "yyyy-MM-dd HH:mm:ss" in China timezone.
 * Use this for displaying createdAt / updatedAt from the database.
 */
export const toChineseDatetimeString = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try { return CHINA_DATETIME_FMT.format(new Date(s)); } catch { return ""; }
};
