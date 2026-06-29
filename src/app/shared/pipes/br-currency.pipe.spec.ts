import { BrCurrencyPipe } from './br-currency.pipe';

describe('BrCurrencyPipe', () => {
  const pipe = new BrCurrencyPipe();

  it.each([
    [99.99, 'R$ 99,99'],
    [1000, 'R$ 1.000,00'],
    [1234.5, 'R$ 1.234,50'],
    ['99.99', 'R$ 99,99'],
  ])('should format %s as Brazilian currency', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each([null, undefined, 'invalid'])('should render dash for invalid values', (value) => {
    expect(pipe.transform(value)).toBe('—');
  });
});
