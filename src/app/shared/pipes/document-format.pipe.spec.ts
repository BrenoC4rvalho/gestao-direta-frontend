import { DocumentFormatPipe } from './document-format.pipe';

describe('DocumentFormatPipe', () => {
  const pipe = new DocumentFormatPipe();

  it('should format CPF and CNPJ values', () => {
    expect(pipe.transform('12345678900')).toBe('123.456.789-00');
    expect(pipe.transform('12345678901234')).toBe('12.345.678/9012-34');
  });

  it('should format already punctuated values', () => {
    expect(pipe.transform('123.456.789-00')).toBe('123.456.789-00');
    expect(pipe.transform('12.345.678/9012-34')).toBe('12.345.678/9012-34');
  });

  it('should render empty values as a dash', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });

  it('should keep invalid lengths as digits', () => {
    expect(pipe.transform('123.45')).toBe('12345');
  });

  it('should accept number values', () => {
    expect(pipe.transform(12345678900)).toBe('123.456.789-00');
  });
});
