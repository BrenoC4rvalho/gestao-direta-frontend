import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { HarvestsPage } from './harvests-page';

describe('HarvestsPage', () => {
  let fixture: ComponentFixture<HarvestsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HarvestsPage],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(HarvestsPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should render the harvests page structure and summary cards', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Safras em andamento');
    expect(text).toContain('Safras ativas');
    expect(text).toContain('3');
    expect(text).toContain('Custo total');
    expect(text).toContain('Receita prevista');
    expect(text).toContain('Lucro estimado');
    expect(text).toContain('R$');
  });

  it('should render mocked harvest cards', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Safra Soja 2025/26');
    expect(text).toContain('Safra Milho 2025/26');
    expect(text).toContain('Safra Feijão 2025/26');
    expect(text).toContain('Plantio concluído');
    expect(text).toContain('68%');
    expect(text).toContain('Diesel');
    expect(text).toContain('Venda futura');
  });

  it('should filter harvests locally by search term', () => {
    setSearch('Milho');

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[aria-label="Progresso de Safra Milho 2025/26"]')).toBeTruthy();
    expect(element.querySelector('[aria-label="Progresso de Safra Soja 2025/26"]')).toBeNull();
    expect(element.querySelector('[aria-label="Progresso de Safra Feijão 2025/26"]')).toBeNull();
  });

  it('should filter harvests locally by status chips', () => {
    clickButton('Planejadas');

    let text = fixture.nativeElement.textContent;
    expect(text).toContain('Safra Feijão 2025/26');
    expect(text).not.toContain('Safra Soja 2025/26');
    expect(text).not.toContain('Safra Milho 2025/26');
    expect(findButton('Planejadas')?.getAttribute('aria-pressed')).toBe('true');

    clickButton('Ativas');

    text = fixture.nativeElement.textContent;
    expect(text).toContain('Safra Soja 2025/26');
    expect(text).toContain('Safra Milho 2025/26');
    expect(text).not.toContain('Safra Feijão 2025/26');
  });

  it('should render recent harvest history as desktop table and mobile list', () => {
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? '';

    expect(text).toContain('Histórico recente da safra');
    expect(text).toContain('Compra de diesel');
    expect(text).toContain('Venda futura registrada');
    expect(text).toContain('Cadastro da nova safra');
    expect(element.querySelector('table caption')?.textContent).toContain('Histórico recente da safra');
    expect(element.querySelector('[aria-label="Histórico recente em lista"]')).toBeTruthy();
  });

  it('should open the placeholder drawer when creating a harvest', () => {
    clickButton('Nova safra');

    expect(getDrawerDialog()?.textContent).toContain('Cadastro de safra será implementado na próxima etapa.');
  });

  function setSearch(value: string): void {
    const component = fixture.componentInstance as unknown as {
      searchControl: { setValue(value: string): void };
    };

    component.searchControl.setValue(value);
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    findButton(label)?.click();
    fixture.detectChanges();
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;

    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  function getDrawerDialog(): HTMLElement | null {
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('gd-drawer [role="dialog"]');
  }
});
