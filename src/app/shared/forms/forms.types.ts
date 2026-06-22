import { FormControl } from '@angular/forms';

export type GdFormValue = string | number | boolean | null;
export type GdFormControl = FormControl<GdFormValue>;

export interface GdSelectOption {
  label: string;
  value: Exclude<GdFormValue, null>;
}
