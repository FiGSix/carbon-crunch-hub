/**
 * Normalise a free-form phone number into the digits-only international
 * format that wa.me expects (no '+', no leading '0', country code included).
 *
 * Returns null when we cannot confidently produce a valid international
 * number — callers should hide the WhatsApp affordance in that case
 * rather than render a link that will trigger WhatsApp's
 * "This link couldn't be opened" error.
 */

// Default country code for numbers stored in local format (leading '0').
// Crunch Carbon is ZA-based; lift to config if we go multi-region.
const DEFAULT_COUNTRY_CODE = "27";

export function toWaMeDigits(
  raw: string | null | undefined,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // 00-prefixed international (e.g. 0027821234567)
  if (!hasPlus && digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (!hasPlus && digits.startsWith("0")) {
    // Local format — prepend country code, drop the trunk 0.
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }

  // wa.me accepts 8–15 digit international numbers. Be conservative.
  if (digits.length < 8 || digits.length > 15) return null;

  return digits;
}
