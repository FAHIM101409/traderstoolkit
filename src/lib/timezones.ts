export type TzOption = { id: string; label: string; ianaOrOffset: string };

// `ianaOrOffset` is either a real IANA tz id (used with Intl APIs) or "local"
// which means use the user's device timezone.
export const TIMEZONES: TzOption[] = [
  { id: "local", label: "Local Device Time", ianaOrOffset: "local" },
  { id: "UTC", label: "UTC", ianaOrOffset: "UTC" },
  { id: "GMT", label: "GMT (London winter)", ianaOrOffset: "Etc/GMT" },
  { id: "WAT", label: "WAT — West Africa (UTC+1)", ianaOrOffset: "Africa/Lagos" },
  { id: "CET", label: "CET — Central Europe", ianaOrOffset: "Europe/Berlin" },
  { id: "EET", label: "EET — Eastern Europe", ianaOrOffset: "Europe/Athens" },
  { id: "EST", label: "EST — US Eastern", ianaOrOffset: "America/New_York" },
  { id: "CST", label: "CST — US Central", ianaOrOffset: "America/Chicago" },
  { id: "PST", label: "PST — US Pacific", ianaOrOffset: "America/Los_Angeles" },
  { id: "JST", label: "JST — Tokyo", ianaOrOffset: "Asia/Tokyo" },
  { id: "AEST", label: "AEST — Sydney", ianaOrOffset: "Australia/Sydney" },
  { id: "GST", label: "GST — Dubai", ianaOrOffset: "Asia/Dubai" },
  { id: "IST", label: "IST — India", ianaOrOffset: "Asia/Kolkata" },
];

/** Returns hour (0-23) and minute (0-59) for the given Date in the chosen zone. */
export function getZonedHM(date: Date, zone: string): { hour: number; minute: number } {
  if (zone === "local") {
    return { hour: date.getHours(), minute: date.getMinutes() };
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = fmt.formatToParts(date);
    const h = parts.find((p) => p.type === "hour")?.value ?? "00";
    const m = parts.find((p) => p.type === "minute")?.value ?? "00";
    return { hour: parseInt(h, 10) % 24, minute: parseInt(m, 10) };
  } catch {
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}
