import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: `<gd-badge variant="success" size="sm">Active</gd-badge>`,
})
class BadgeHost {}

describe('Badge', () => {
  it('should render content with configured classes', async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(BadgeHost);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(badge.textContent).toContain('Active');
    expect(badge.className).toContain('bg-success/10');
    expect(badge.className).toContain('text-xs');
  });
});
