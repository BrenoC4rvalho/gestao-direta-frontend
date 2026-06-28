export type DocumentType = 'CPF' | 'CNPJ';

export function onlyDigits(value: unknown): string {
  return `${value ?? ''}`.replace(/\D/g, '');
}

export function formatCpf(value: unknown): string {
  const digits = onlyDigits(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  return [part1, part2, part3].filter(Boolean).join('.') + (part4 ? `-${part4}` : '');
}

export function formatCnpj(value: unknown): string {
  const digits = onlyDigits(value).slice(0, 14);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);

  let formatted = [part1, part2, part3].filter(Boolean).join('.');

  if (part4) {
    formatted += `/${part4}`;
  }

  if (part5) {
    formatted += `-${part5}`;
  }

  return formatted;
}

export function formatCpfCnpj(value: unknown): string {
  const digits = onlyDigits(value);

  if (!digits) {
    return '—';
  }

  if (digits.length === 11) {
    return formatCpf(digits);
  }

  if (digits.length === 14) {
    return formatCnpj(digits);
  }

  return digits;
}

export function inferDocumentType(value: unknown): DocumentType | null {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return 'CPF';
  }

  if (digits.length === 14) {
    return 'CNPJ';
  }

  return null;
}
