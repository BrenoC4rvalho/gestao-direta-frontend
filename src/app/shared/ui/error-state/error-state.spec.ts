import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ErrorState } from './error-state';

@Component({
  imports: [ErrorState],
  template: `
    <gd-error-state
      title="Could not load"
      description="Try again later."
      actionLabel="Retry"
      (action)="handled = true"
    />
  `,
})
class ErrorStateHost {
  handled = false;
}

describe('ErrorState', () => {
  it('should render content and emit action', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorStateHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load');

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(fixture.componentInstance.handled).toBe(true);
  });
});
