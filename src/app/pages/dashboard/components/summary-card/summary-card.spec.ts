import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';

import { SummaryCard } from './summary-card';

const description = 'Resultado financeiro já realizado: entradas pagas menos saídas pagas.';
const detail = 'Considera apenas movimentações pagas.';

describe('SummaryCard', () => {
  async function createComponent(detailText: string | null = detail) {
    await TestBed.configureTestingModule({
      imports: [SummaryCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(SummaryCard);
    fixture.componentRef.setInput('title', 'Saldo atual');
    fixture.componentRef.setInput('value', 'R$ 1.000,00');
    fixture.componentRef.setInput('description', description);
    fixture.componentRef.setInput('detail', detailText);
    fixture.componentRef.setInput('icon', 'wallet');
    fixture.detectChanges();

    return fixture;
  }

  function visibleCardText(fixture: ComponentFixture<SummaryCard>): string {
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;
    const paragraphs = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).filter((paragraph) => !tooltip?.contains(paragraph));

    return paragraphs.map((paragraph) => paragraph.textContent ?? '').join(' ');
  }

  it('should render title, value and accessible tooltip explanation', async () => {
    const fixture = await createComponent();

    expect(visibleCardText(fixture)).toContain('Saldo atual');
    expect(visibleCardText(fixture)).toContain('R$ 1.000,00');
    expect(visibleCardText(fixture)).not.toContain(description);
    expect(visibleCardText(fixture)).not.toContain(detail);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('Explicação sobre Saldo atual');
    expect(button?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    expect(tooltip?.textContent).toContain(description);
    expect(tooltip?.textContent).toContain(detail);
  });

  it('should toggle tooltip state by click', async () => {
    const fixture = await createComponent();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('should work without optional detail', async () => {
    const fixture = await createComponent(null);
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;

    expect(visibleCardText(fixture)).toContain('Saldo atual');
    expect(visibleCardText(fixture)).not.toContain(description);
    expect(tooltip?.textContent).toContain(description);
    expect(tooltip?.textContent).not.toContain(detail);
  });

  it('should keep long values readable and use full-height layout', async () => {
    const fixture = await createComponent();

    const value = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).find((item) => item.textContent?.includes('R$ 1.000,00'));
    const article = fixture.nativeElement.querySelector('article') as HTMLElement | null;

    expect(value?.className).toContain('break-words');
    expect(value?.className).not.toContain('truncate');
    expect(article?.className).toContain('h-full');
    expect(article?.className).toContain('min-h-[128px]');
  });
});
