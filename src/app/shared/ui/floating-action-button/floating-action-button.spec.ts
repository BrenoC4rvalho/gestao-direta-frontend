import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { FloatingActionButton } from './floating-action-button';

describe('FloatingActionButton', () => {
  async function createComponent(disabled = false) {
    await TestBed.configureTestingModule({
      imports: [FloatingActionButton],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(FloatingActionButton);
    fixture.componentRef.setInput('ariaLabel', 'Nova movimentação com IA');
    fixture.componentRef.setInput('tooltipTitle', 'Nova movimentação com IA');
    fixture.componentRef.setInput('tooltipDescription', 'Descreva em texto e revise antes de salvar');
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    return fixture;
  }

  it('should render the configured icon with an accessible label', async () => {
    const fixture = await createComponent();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const icon = button.querySelector('svg') as SVGElement;
    expect(button.getAttribute('aria-label')).toBe('Nova movimentação com IA');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('should expose tooltip title and description on hover and focus', async () => {
    const fixture = await createComponent();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.textContent).toContain('Nova movimentação com IA');
    expect(tooltip.textContent).toContain('Descreva em texto e revise antes de salvar');
    expect(tooltip.className).toContain('group-hover:visible');
    expect(tooltip.className).toContain('group-focus-within:visible');
  });

  it('should emit when clicked and not emit when disabled', async () => {
    const fixture = await createComponent();
    const emit = vi.fn();
    fixture.componentInstance.clicked.subscribe(emit);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(emit).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('should provide a 56px touch target and visible keyboard focus', async () => {
    const fixture = await createComponent();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('size-14')).toBe(true);
    expect(button.className).toContain('focus-visible:outline');
    expect(button.className).toContain('focus-visible:outline-3');
    expect(button.className).toContain('focus-visible:outline-primary');
  });
});
