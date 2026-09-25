// Phones are stored as "<country code><10-digit number>", e.g. "+919000000000",
// which also satisfies the backend's /^\+?[0-9]{7,15}$/ rule.
export const PHONE_DIGITS = 10;
export const DEFAULT_COUNTRY_CODE = '+91';

// No code here is a prefix of another, so a stored phone splits back unambiguously.
export const COUNTRY_CODES = [
  { code: '+91', label: 'India' },
  { code: '+971', label: 'UAE' },
  { code: '+966', label: 'Saudi Arabia' },
  { code: '+974', label: 'Qatar' },
  { code: '+965', label: 'Kuwait' },
  { code: '+968', label: 'Oman' },
  { code: '+973', label: 'Bahrain' },
  { code: '+977', label: 'Nepal' },
  { code: '+94', label: 'Sri Lanka' },
  { code: '+880', label: 'Bangladesh' },
  { code: '+65', label: 'Singapore' },
  { code: '+60', label: 'Malaysia' },
  { code: '+44', label: 'UK' },
  { code: '+1', label: 'USA / Canada' },
  { code: '+61', label: 'Australia' },
] as const;

export function splitPhone(value: string): { code: string; number: string } {
  const match = COUNTRY_CODES.find((c) => value.startsWith(c.code));
  const code = match?.code ?? DEFAULT_COUNTRY_CODE;
  return { code, number: match ? value.slice(code.length) : value.replace(/\D/g, '') };
}

export function joinPhone(code: string, number: string): string {
  return code + number.replace(/\D/g, '').slice(0, PHONE_DIGITS);
}
