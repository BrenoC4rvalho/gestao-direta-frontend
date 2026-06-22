import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `
    <gd-button [variant]="variant" [disabled]="disabled" [loading]="loading" [fullWidth]="fullWidth">
      Save
    </gd-button>
  `,
})
class ButtonHost {
  variant: ButtonVariant = 'primary';
  disabled = false;
  loading = false;
  fullWidth = false;
}

describe('Button', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonHost],
    }).compileComponents();
  });

  it('should render projected content', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Save');
  });

  it('should apply variant classes', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.componentInstance.variant = 'danger';
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('bg-danger');
  });

  it('should disable when disabled or loading', () => {
    const disabledFixture = TestBed.createComponent(ButtonHost);
    disabledFixture.componentInstance.disabled = true;
    disabledFixture.detectChanges();

    const disabledButton = disabledFixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(disabledButton.disabled).toBe(true);

    const loadingFixture = TestBed.createComponent(ButtonHost);
    loadingFixture.componentInstance.loading = true;
    loadingFixture.detectChanges();

    const loadingButton = loadingFixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);
  });
});
