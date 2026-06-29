export function sanitizeBrazilianMoneyInput(value: string): string {
  const sanitized = value.replace(/[^\d,]/g, '');
  const commaIndex = sanitized.indexOf(',');

  if (commaIndex === -1) {
    return sanitized;
  }

  const integerPart = sanitized.slice(0, commaIndex);
  const decimalPart = sanitized.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2);

  return `${integerPart},${decimalPart}`;
}

export function brazilianMoneyToNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = `${value ?? ''}`.trim();

  if (!text) {
    return null;
  }

  const normalized = text.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function numberToBrazilianMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  return parsed.toFixed(2).replace('.', ',');
}
