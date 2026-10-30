export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "support",
  "tradivo",
  "moderator",
  "mod",
  "team",
  "official",
  "root",
  "staff",
  "help",
  "security",
  "billing",
  "sales",
  "system",
  "lovable",
  "null",
  "undefined",
];

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Returns an error message, or null when the username is valid. */
export function validateUsername(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(v)) {
    return "Username must be 3-20 characters: lowercase letters, numbers and underscores only";
  }
  if (RESERVED_USERNAMES.includes(v)) {
    return "That username is reserved";
  }
  return null;
}

/** Strips anything that is not a lowercase letter, digit or underscore, capped at 20 chars. */
export function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}
