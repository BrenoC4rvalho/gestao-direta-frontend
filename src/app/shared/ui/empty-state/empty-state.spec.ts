import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';

import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <gd-empty-state
      title="No items"
      description="Items will appear here."
      icon="inbox"
      actionLabel="Create"
      (action)="handled = true"
    />
  `,
})
class EmptyStateHost {
  handled = false;
}

describe('EmptyState', () => {
  it('should render content and emit action', async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmptyStateHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No items');

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(fixture.componentInstance.handled).toBe(true);
  });
});
