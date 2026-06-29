import {
  brazilianMoneyToNumber,
  numberToBrazilianMoney,
  sanitizeBrazilianMoneyInput,
} from './money.utils';

describe('money utils', () => {
  describe('sanitizeBrazilianMoneyInput', () => {
    it.each([
      ['99,99', '99,99'],
      ['R$ 99,99', '99,99'],
      ['1.000,50', '1000,50'],
      ['99.99', '9999'],
      ['abc12,345', '12,34'],
      ['12,,34', '12,34'],
      ['12,3,4,5', '12,34'],
    ])('should sanitize %s to %s', (value, expected) => {
      expect(sanitizeBrazilianMoneyInput(value)).toBe(expected);
    });
  });

  describe('brazilianMoneyToNumber', () => {
    it.each([
      ['99,99', 99.99],
      ['1.000,50', 1000.5],
      ['9999', 9999],
      [99.99, 99.99],
    ])('should parse %s to %s', (value, expected) => {
      expect(brazilianMoneyToNumber(value)).toBe(expected);
    });

    it.each(['', 'abc', null, undefined, Number.NaN])('should return null for %s', (value) => {
      expect(brazilianMoneyToNumber(value)).toBeNull();
    });
  });

  describe('numberToBrazilianMoney', () => {
    it.each([
      [99.99, '99,99'],
      [1000, '1000,00'],
      ['1234.5', '1234,50'],
    ])('should convert %s to input value %s', (value, expected) => {
      expect(numberToBrazilianMoney(value)).toBe(expected);
    });

    it.each(['abc', null, undefined, Number.NaN])('should return empty string for %s', (value) => {
      expect(numberToBrazilianMoney(value)).toBe('');
    });
  });
});
