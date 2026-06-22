import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Skeleton } from './skeleton';

@Component({
  imports: [Skeleton],
  template: `<gd-skeleton width="160px" height="24px" rounded="lg" />`,
})
class SkeletonHost {}

describe('Skeleton', () => {
  it('should render with configured size and radius', async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(SkeletonHost);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(skeleton.style.width).toBe('160px');
    expect(skeleton.style.height).toBe('24px');
    expect(skeleton.className).toContain('rounded-app');
  });
});
