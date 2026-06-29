import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'brCurrency',
})
export class BrCurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    currency = 'BRL',
    locale = 'pt-BR',
  ): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount)) {
      return '—';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }
}
