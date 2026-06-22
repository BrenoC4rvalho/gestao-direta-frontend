import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

import { GdFormValue, GdSelectOption } from '../forms.types';

import { Select } from './select';

@Component({
  imports: [Select],
  template: `
    <gd-select
      id="status"
      label="Status"
      placeholder="Selecione"
      [control]="control"
      [options]="options"
    />
  `,
})
class SelectHost {
  readonly control = new FormControl<GdFormValue>('active');
  readonly options: readonly GdSelectOption[] = [
    { label: 'Ativo', value: 'active' },
    { label: 'Pendente', value: 'pending' },
  ];
}

describe('Select', () => {
  it('should render received options', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const options = fixture.nativeElement.querySelectorAll('option') as NodeListOf<HTMLOptionElement>;

    expect(text).toContain('Status');
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('Ativo');
    expect(options[2].textContent).toContain('Pendente');
  });
});
