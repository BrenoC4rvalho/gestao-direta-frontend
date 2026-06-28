import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Card } from './card';

@Component({
  imports: [Card],
  template: `<gd-card variant="elevated" padding="lg">Card content</gd-card>`,
})
class CardHost {}

describe('Card', () => {
  it('should render content with configured classes', async () => {
    await TestBed.configureTestingModule({
      imports: [CardHost],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardHost);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(card.textContent).toContain('Card content');
    expect(card.className).toContain('shadow-soft');
    expect(card.className).toContain('p-6');
    expect(card.className).toContain('transition-all');
    expect(card.className).toContain('duration-200');
  });
});
