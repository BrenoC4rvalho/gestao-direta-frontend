import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialPeriodSelector } from './financial-period-selector';

describe('FinancialPeriodSelector', () => {
  async function createComponent(): Promise<ComponentFixture<FinancialPeriodSelector>> {
    await TestBed.configureTestingModule({
      imports: [FinancialPeriodSelector],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(FinancialPeriodSelector);
    fixture.componentRef.setInput('selectedPeriod', 30);
    fixture.componentRef.setInput('periods', [30, 90, 180]);
    fixture.detectChanges();
    return fixture;
  }

  function trigger(fixture: ComponentFixture<FinancialPeriodSelector>): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-haspopup="listbox"]');
  }

  function options(fixture: ComponentFixture<FinancialPeriodSelector>): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[role="option"]') as NodeListOf<HTMLButtonElement>,
    );
  }

  it('renders the initial period in a compact responsive control', async () => {
    const fixture = await createComponent();
    const button = trigger(fixture);

    expect(button.textContent).toContain('Período');
    expect(button.textContent).toContain('Últimos 30 dias');
    expect(button.className).toContain('h-16');
    expect(button.className).toContain('w-full');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('opens the dropdown and highlights the selected option', async () => {
    const fixture = await createComponent();
    trigger(fixture).click();
    fixture.detectChanges();

    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(options(fixture).map((option) => option.textContent?.trim())).toEqual([
      'Últimos 30 dias',
      'Últimos 90 dias',
      'Últimos 180 dias',
    ]);
    expect(options(fixture)[0].getAttribute('aria-selected')).toBe('true');
    expect(options(fixture)[0].className).toContain('bg-highlight-soft');
  });

  it('emits the numeric period and closes after selection', async () => {
    const fixture = await createComponent();
    const selectedPeriods: number[] = [];
    fixture.componentInstance.periodChange.subscribe((period) => selectedPeriods.push(period));

    trigger(fixture).click();
    fixture.detectChanges();
    options(fixture)[1].click();
    fixture.detectChanges();

    expect(selectedPeriods).toEqual([90]);
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('closes on outside click and Escape', async () => {
    const fixture = await createComponent();

    trigger(fixture).click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');

    trigger(fixture).click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
  });

  it('supports opening and navigating options with the keyboard', async () => {
    const fixture = await createComponent();
    trigger(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(options(fixture)[0]);

    options(fixture)[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(options(fixture)[1]);
  });
});
