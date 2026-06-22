import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FieldError } from './field-error';

@Component({
  imports: [FieldError],
  template: `<gd-field-error id="empty-error" message="" />`,
})
class FieldErrorHost {}

describe('FieldError', () => {
  it('should not render an empty message', async () => {
    await TestBed.configureTestingModule({
      imports: [FieldErrorHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(FieldErrorHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});
