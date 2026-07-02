import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { ProductionActivitiesPage } from './production-activities-page';

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

const producer: AuthUser = {
  id: 2,
  name: 'Produtor',
  email: 'producer@example.com',
  document: null,
  userType: 'USER',
  status: 'ACTIVE',
};

describe('ProductionActivitiesPage', () => {
  let fixture: ComponentFixture<ProductionActivitiesPage>;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionActivitiesPage],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    sessionStore.clear();
    toastStore.clear();
    sessionStore.setUser(admin);
  });

  afterEach(() => {
    sessionStore.clear();
    toastStore.clear();
    TestBed.resetTestingModule();
    document.body.classList.remove('gd-overlay-open');
  });

  it('should render the production activities page and summary cards for admin', () => {
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total de atividades');
    expect(text).toContain('Cadastros disponíveis');
    expect(text).toContain('Ativas');
    expect(text).toContain('Inativas');
    expect(text).toContain('Mais usadas');
    expect(text).toContain('Soja');
  });

  it('should show access restriction for non-admin users', () => {
    sessionStore.setUser(producer);
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acesso restrito');
    expect(text).not.toContain('Nova atividade produtiva');
  });

  it('should render filters and mocked activity list', () => {
    createPage();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Filtros');
    expect(text).toContain('Busca');
    expect(text).toContain('Todas');
    expect(text).toContain('Ativas');
    expect(text).toContain('Inativas');
    expect(text).toContain('Milho');
    expect(text).toContain('Cultura anual para grãos e silagem');
    expect(text).toContain('Gado de corte');
    expect(fixture.nativeElement.querySelector('table caption')?.textContent).toContain(
      'Atividades produtivas cadastradas',
    );
    expect(fixture.nativeElement.querySelector('[aria-label="Lista mobile de atividades produtivas"]')).toBeTruthy();
  });

  it('should filter locally by activity name', () => {
    createPage();

    setSearch('Milho');

    expect(getActivityCard('Milho')).toBeTruthy();
    expect(getActivityCard('Soja')).toBeNull();
    expect(getActivityCard('Feijão')).toBeNull();
  });

  it('should filter locally by activity description', () => {
    createPage();

    setSearch('silagem');

    expect(getActivityCard('Milho')).toBeTruthy();
    expect(getActivityCard('Soja')).toBeNull();
  });

  it('should filter activities locally by status chips', () => {
    createPage();

    clickButton('Inativas');

    expect(getActivityCard('Gado de leite')).toBeTruthy();
    expect(getActivityCard('Feijão')).toBeTruthy();
    expect(getActivityCard('Soja')).toBeNull();
    expect(findButton('Inativas')?.getAttribute('aria-pressed')).toBe('true');

    clickButton('Ativas');

    expect(getActivityCard('Soja')).toBeTruthy();
    expect(getActivityCard('Gado de leite')).toBeNull();
  });

  it('should open the create drawer placeholder and save without backend', () => {
    createPage();

    clickButton('Nova atividade produtiva');
    expect(getDrawerDialog()?.textContent).toContain(
      'Cadastro de atividade produtiva será implementado na integração com backend.',
    );

    clickButton('Salvar');

    expect(toastStore.toasts()[0]?.title).toBe('Cadastro será integrado ao backend em breve.');
  });

  it('should open view and edit drawer placeholders', () => {
    createPage();

    clickButton('Visualizar');
    expect(getDrawerDialog()?.textContent).toContain('Soja');
    expect(getDrawerDialog()?.textContent).toContain('Cultura anual de grãos');
    closeDrawer();

    clickButton('Editar');
    expect(getDrawerDialog()?.textContent).toContain('Editar atividade produtiva');
    expect(getDrawerDialog()?.textContent).toContain('Soja');
  });

  it('should toggle status locally and show toast without backend', () => {
    createPage();

    clickButton('Inativar');
    clickDialogButton('Inativar');

    expect(toastStore.toasts()[0]?.title).toBe('Atividade produtiva inativada no mock local.');

    clickButton('Inativas');

    expect(getActivityCard('Soja')).toBeTruthy();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ProductionActivitiesPage);
    fixture.detectChanges();
  }

  function setSearch(value: string): void {
    const component = fixture.componentInstance as unknown as {
      searchControl: { setValue(value: string): void };
    };

    component.searchControl.setValue(value);
    fixture.detectChanges();
  }

  function getActivityCard(name: string): HTMLElement | null {
    const element = fixture.nativeElement as HTMLElement;
    return element.querySelector('[aria-label="Atividade produtiva ' + name + '"]');
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

  function clickDialogButton(label: string): void {
    const element = fixture.nativeElement as HTMLElement;
    const dialogs = Array.from(element.querySelectorAll('gd-confirm-dialog [role="dialog"]'));
    const button = dialogs
      .flatMap((dialog) => Array.from(dialog.querySelectorAll('button')))
      .find((item) => item.textContent?.trim() === label);

    button?.click();
    fixture.detectChanges();
  }

  function closeDrawer(): void {
    const closeButton = (fixture.nativeElement as HTMLElement).querySelector(
      'gd-drawer [aria-label="Fechar drawer"]',
    ) as HTMLButtonElement | null;
    closeButton?.click();
    fixture.detectChanges();
  }

  function getDrawerDialog(): HTMLElement | null {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('gd-drawer [role="dialog"]');
  }
});
