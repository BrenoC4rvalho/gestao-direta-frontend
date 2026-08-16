import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

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
      labelTooltip="Status usado para filtrar os itens"
      labelTooltipAriaLabel="Entenda o status"
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
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const options = fixture.nativeElement.querySelectorAll(
      'option',
    ) as NodeListOf<HTMLOptionElement>;

    expect(text).toContain('Status');
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('Ativo');
    expect(options[2].textContent).toContain('Pendente');
  });

  it('should render an accessible label tooltip when configured', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();

    const tooltipTrigger = fixture.nativeElement.querySelector('gd-tooltip') as HTMLElement;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;

    expect(tooltipTrigger.getAttribute('aria-label')).toBe('Entenda o status');
    expect(tooltipTrigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.textContent).toContain('Status usado para filtrar os itens');
  });
});
