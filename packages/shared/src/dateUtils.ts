const SHANGHAI_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" });
const SHANGHAI_DATETIME_FMT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});
const SHANGHAI_DATE_LONG_FMT = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric", month: "long", day: "numeric",
});

/** Any date value → "yyyy-MM-dd" in China timezone. */
export const toChineseDate = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try { return SHANGHAI_DATE_FMT.format(new Date(s)); } catch { return ""; }
};

/** Any datetime value → "yyyy-MM-dd HH:mm:ss" in China timezone. */
export const toChineseDatetime = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try { return SHANGHAI_DATETIME_FMT.format(new Date(s)); } catch { return ""; }
};

/** Any date value → "2027年3月15日" in China timezone. For public display. */
export const formatChineseDateLong = (raw: unknown): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try { return SHANGHAI_DATE_LONG_FMT.format(new Date(s)); } catch { return ""; }
};

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
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
