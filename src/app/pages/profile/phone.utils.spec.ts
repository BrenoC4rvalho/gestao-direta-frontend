import {
  formatBrazilianPhoneInput,
  normalizeBrazilianPhone,
  phoneDigits,
} from './phone.utils';

describe('phone.utils', () => {
  it('formats a Brazilian landline while typing', () => {
    expect(formatBrazilianPhoneInput('2433334444')).toBe('(24) 3333-4444');
  });

  it('formats a Brazilian mobile while typing', () => {
    expect(formatBrazilianPhoneInput('24999999999')).toBe('(24) 99999-9999');
  });

  it('accepts pasted values with or without formatting', () => {
    expect(formatBrazilianPhoneInput('(24) 99999-9999')).toBe('(24) 99999-9999');
    expect(formatBrazilianPhoneInput('+55 (24) 99999-9999')).toBe('(24) 99999-9999');
    expect(normalizeBrazilianPhone('24999999999')).toBe('+5524999999999');
  });

  it('ignores invalid characters and limits input to eleven local digits', () => {
    expect(formatBrazilianPhoneInput('a24b99999-9999xyz')).toBe('(24) 99999-9999');
    expect(phoneDigits('(24) 99999-99990000')).toBe('249999999990000');
    expect(formatBrazilianPhoneInput('2499999999990000')).toBe('(24) 99999-9999');
  });

  it('rejects incomplete Brazilian phones', () => {
    expect(normalizeBrazilianPhone('243333444')).toBeNull();
    expect(normalizeBrazilianPhone('(24) 3333-4444')).toBe('+552433334444');
  });
});
