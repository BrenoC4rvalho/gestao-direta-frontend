import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button, ButtonVariant } from './button';

@Component({
  imports: [Button],
  template: `
    <gd-button [variant]="variant" [disabled]="disabled" [loading]="loading" [fullWidth]="fullWidth">
      Save
    </gd-button>
    <gd-button [iconOnly]="true" ariaLabel="Search" title="Search">
      S
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

  it('should expose icon-only accessibility attributes', () => {
    const fixture = TestBed.createComponent(ButtonHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Search');
    expect(button.getAttribute('title')).toBe('Search');
    expect(button.className).toContain('size-10');
  });
});
