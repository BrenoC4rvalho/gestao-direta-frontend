import { Pipe, PipeTransform } from '@angular/core';

import { formatCpfCnpj } from '../utils/document.utils';

@Pipe({
  name: 'documentFormat',
})
export class DocumentFormatPipe implements PipeTransform {
  transform(value: unknown): string {
    return formatCpfCnpj(value);
  }
}
