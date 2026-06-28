import {
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  inferDocumentType,
  onlyDigits,
} from './document.utils';

describe('document utils', () => {
  it('should keep only digits', () => {
    expect(onlyDigits(' 123.456.789-00 ')).toBe('12345678900');
    expect(onlyDigits(null)).toBe('');
    expect(onlyDigits(12345)).toBe('12345');
  });

  it('should format CPF up to the available length', () => {
    expect(formatCpf('1')).toBe('1');
    expect(formatCpf('1234')).toBe('123.4');
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
    expect(formatCpf('12345678900111')).toBe('123.456.789-00');
  });

  it('should format CNPJ up to the available length', () => {
    expect(formatCnpj('1')).toBe('1');
    expect(formatCnpj('123')).toBe('12.3');
    expect(formatCnpj('12345678901234')).toBe('12.345.678/9012-34');
    expect(formatCnpj('123456789012345')).toBe('12.345.678/9012-34');
  });

  it('should format CPF/CNPJ and keep invalid lengths as digits', () => {
    expect(formatCpfCnpj('')).toBe('—');
    expect(formatCpfCnpj('12345678900')).toBe('123.456.789-00');
    expect(formatCpfCnpj('12345678901234')).toBe('12.345.678/9012-34');
    expect(formatCpfCnpj('123.45')).toBe('12345');
  });

  it('should infer document type only for complete lengths', () => {
    expect(inferDocumentType('12345678900')).toBe('CPF');
    expect(inferDocumentType('12.345.678/9012-34')).toBe('CNPJ');
    expect(inferDocumentType('')).toBeNull();
    expect(inferDocumentType('123')).toBeNull();
  });
});
