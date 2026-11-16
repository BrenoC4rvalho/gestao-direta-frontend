const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_LOCAL_PHONE_MIN_DIGITS = 10;
const BRAZIL_LOCAL_PHONE_MAX_DIGITS = 11;
const ACCEPTED_PHONE_CHARACTERS = /^[+()\-\s\d]*$/;

export function phoneDigits(value: string | number | boolean | null): string {
  return `${value ?? ''}`.replace(/\D/g, '');
}

export function normalizeBrazilianPhone(value: string | number | boolean | null): string | null {
  const digits = phoneDigits(value);

  const hasCountryCode = digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12;
  const localDigits = hasCountryCode ? digits.slice(2) : digits;

  if (
    localDigits.length < BRAZIL_LOCAL_PHONE_MIN_DIGITS ||
    localDigits.length > BRAZIL_LOCAL_PHONE_MAX_DIGITS
  ) {
    return null;
  }

  return `+${BRAZIL_COUNTRY_CODE}${localDigits}`;
}

export function formatBrazilianPhone(value: string | number | boolean | null): string {
  const digits = phoneDigits(value);

  const hasCountryCode = digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12;
  const localDigits = hasCountryCode ? digits.slice(2) : digits;

  if (
    localDigits.length < BRAZIL_LOCAL_PHONE_MIN_DIGITS ||
    localDigits.length > BRAZIL_LOCAL_PHONE_MAX_DIGITS
  ) {
    return `${value ?? ''}`;
  }

  return `+55 (${localDigits.slice(0, 2)}) ${localDigits.length === 11 ? localDigits.slice(2, 7) : localDigits.slice(2, 6)}-${localDigits.length === 11 ? localDigits.slice(7) : localDigits.slice(6)}`;
}

export function formatBrazilianPhoneInput(value: string | number | boolean | null): string {
  const rawValue = `${value ?? ''}`;
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) return '';

  const digits = phoneDigits(rawValue);
  const hasCountryCode =
    trimmedValue.startsWith(`+${BRAZIL_COUNTRY_CODE}`) ||
    (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12);
  const withoutCountryCode = hasCountryCode ? digits.slice(2) : digits;
  const limitedDigits = withoutCountryCode.slice(0, BRAZIL_LOCAL_PHONE_MAX_DIGITS);
  const ddd = limitedDigits.slice(0, 2);
  const number = limitedDigits.slice(2);

  if (limitedDigits.length <= 2) return ddd ? `(${ddd}` : '';
  if (number.length <= (limitedDigits.length === 11 ? 5 : 4)) return `(${ddd}) ${number}`;

  const split = limitedDigits.length === 11 ? 5 : 4;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}

export function isPhoneInputCharacterSetValid(value: string | number | boolean | null): boolean {
  return ACCEPTED_PHONE_CHARACTERS.test(`${value ?? ''}`);
}
