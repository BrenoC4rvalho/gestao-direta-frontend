const BRAZIL_COUNTRY_CODE = '55';
const BRAZIL_PHONE_DIGITS = 13;
const ACCEPTED_PHONE_CHARACTERS = /^[+()\-\s\d]*$/;

export function phoneDigits(value: string | number | boolean | null): string {
  return `${value ?? ''}`.replace(/\D/g, '');
}

export function normalizeBrazilianPhone(value: string | number | boolean | null): string | null {
  const digits = phoneDigits(value);

  if (digits.length !== BRAZIL_PHONE_DIGITS || !digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return null;
  }

  return `+${digits}`;
}

export function formatBrazilianPhone(value: string | number | boolean | null): string {
  const digits = phoneDigits(value);

  if (digits.length !== BRAZIL_PHONE_DIGITS || !digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return `${value ?? ''}`;
  }

  return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
}

export function formatBrazilianPhoneInput(value: string | number | boolean | null): string {
  const rawValue = `${value ?? ''}`;
  const trimmedValue = rawValue.trim();

  if (!trimmedValue || !ACCEPTED_PHONE_CHARACTERS.test(rawValue)) {
    return rawValue;
  }

  const digits = phoneDigits(rawValue);

  if (!trimmedValue.startsWith('+') || !digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return rawValue;
  }

  const limitedDigits = digits.slice(0, BRAZIL_PHONE_DIGITS);
  const ddd = limitedDigits.slice(2, 4);
  const number = limitedDigits.slice(4);

  if (limitedDigits.length <= 2) {
    return `+${limitedDigits}`;
  }

  if (limitedDigits.length <= 4) {
    return `+55 (${ddd}`;
  }

  if (number.length <= 5) {
    return `+55 (${ddd}) ${number}`;
  }

  return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

export function isPhoneInputCharacterSetValid(value: string | number | boolean | null): boolean {
  return ACCEPTED_PHONE_CHARACTERS.test(`${value ?? ''}`);
}
