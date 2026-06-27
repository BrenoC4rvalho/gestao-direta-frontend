import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { GdFormValue } from '../forms.types';

import { Input } from './input';

@Component({
  imports: [Input],
  template: `
    <gd-input
      id="farm-name"
      label="Nome"
      placeholder="Informe o nome"
      hint="Ajuda do campo"
      [control]="hintControl"
    />

    <gd-input
      id="transaction-date"
      label="Data"
      type="date"
      [control]="dateControl"
    />

    <gd-input
      id="required-name"
      label="Obrigatório"
      placeholder="Informe o valor"
      errorMessage="Campo obrigatório."
      [control]="errorControl"
      [required]="true"
    />
  `,
})
class InputHost {
  readonly hintControl = new FormControl<GdFormValue>('Fazenda');
  readonly dateControl = new FormControl<GdFormValue>('2026-06-21');
  readonly errorControl = new FormControl<GdFormValue>('', {
    validators: [Validators.required],
  });

  constructor() {
    this.errorControl.markAsTouched();
  }
}

describe('Input', () => {
  it('should render label, placeholder, hint and touched validation error', async () => {
    await TestBed.configureTestingModule({
      imports: [InputHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(InputHost);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    expect(text).toContain('Nome');
    expect(text).toContain('Ajuda do campo');
    expect(text).toContain('Obrigatório');
    expect(text).toContain('Campo obrigatório.');
    expect(inputs[0].placeholder).toBe('Informe o nome');
    expect(inputs[1].type).toBe('date');
    expect(inputs[2].getAttribute('aria-invalid')).toBe('true');
  });
});
