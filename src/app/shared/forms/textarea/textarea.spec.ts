import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';

import { GdFormValue } from '../forms.types';

import { Textarea } from './textarea';

@Component({
  imports: [Textarea],
  template: `
    <gd-textarea
      id="notes"
      label="Observações"
      placeholder="Digite uma observação"
      [control]="control"
      [maxlength]="20"
    />
  `,
})
class TextareaHost {
  readonly control = new FormControl<GdFormValue>('Texto');
}

describe('Textarea', () => {
  it('should render a counter when maxlength exists', async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(TextareaHost);
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Observações');
    expect(text).toContain('5/20');
    expect(textarea.placeholder).toBe('Digite uma observação');
  });
});
