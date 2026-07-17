import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tooltip } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `
    <gd-tooltip ariaLabel="Detalhes financeiros" content="Linha um\nLinha dois">
      <span>Indicador</span>
    </gd-tooltip>
  `,
})
class TooltipHost {}

describe('Tooltip', () => {
  let fixture: ComponentFixture<TooltipHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TooltipHost] }).compileComponents();
    fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
  });

  it('should associate its focused trigger with an accessible tooltip', () => {
    const trigger = fixture.nativeElement.querySelector('gd-tooltip') as HTMLElement;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;

    expect(trigger.getAttribute('tabindex')).toBe('0');
    expect(trigger.getAttribute('aria-label')).toBe('Detalhes financeiros');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.textContent).toContain('Linha um');
    expect(tooltip.textContent).toContain('Linha dois');
  });

  it('should expose the tooltip on hover and keyboard focus with a high stacking order', () => {
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;

    expect(tooltip.className).toContain('group-hover:visible');
    expect(tooltip.className).toContain('group-focus-within:visible');
    expect(tooltip.className).toContain('z-[999]');
  });
});
