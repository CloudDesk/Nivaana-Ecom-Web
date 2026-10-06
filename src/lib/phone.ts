/**
 * Digits of an Indian mobile number with a leading country code (91, 12 digits)
 * or trunk zero (0, 11 digits) removed. Not truncated, so malformed numbers stay
 * invalid instead of being silently shortened.
 */
export const canonicalIndianMobile = (raw: string): string => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

/**
 * Normalises an Indian mobile number entered, pasted or autofilled into a
 * 10-digit field (the +91 prefix is shown separately).
 *
 * Browsers often autofill "+91 99948 24573" or "099948 24573". Keeping only the
 * first 10 digits would turn those into "9199948245", so the prefix is removed
 * first. Typing is unaffected: the field holds at most 10 digits, so it never
 * reaches 11 or 12. Do not add maxLength={10} to these inputs: the browser would
 * cut "+919994824573" to "+919994824" before this runs.
 */
export const normalizeIndianMobileInput = (raw: string): string => canonicalIndianMobile(raw).slice(0, 10);

/** Indian mobile number: exactly 10 digits starting with 6, 7, 8 or 9. */
export const isValidIndianMobile = (value: string): boolean => /^[6-9]\d{9}$/.test(value);

export const INVALID_MOBILE_MESSAGE = "Please enter a valid 10-digit mobile number.";
