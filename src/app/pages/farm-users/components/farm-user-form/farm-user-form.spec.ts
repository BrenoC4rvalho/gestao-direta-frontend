import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { User } from '../../../../core/models/user.models';

import { FarmUserForm } from './farm-user-form';

const users: User[] = [
  {
    id: 2,
    name: 'Maria Silva',
    email: 'maria@example.com',
    document: null,
    userType: 'USER',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const foundUser: User = {
  id: 3,
  name: 'Ana Souza',
  email: 'ana@example.com',
  document: null,
  userType: 'USER',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('FarmUserForm', () => {
  let fixture: ComponentFixture<FarmUserForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmUserForm],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
    fixture = TestBed.createComponent(FarmUserForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('users', users);
    fixture.componentRef.setInput('roles', ['EMPLOYEE', 'ACCOUNTANT']);
    fixture.detectChanges();
  });

  it('should validate required fields', () => {
    submit();

    expect(fixture.nativeElement.textContent).toContain(
      'Selecione ou pesquise um usuário para vincular.',
    );
    expect(fixture.nativeElement.textContent).toContain('Selecione o papel na fazenda.');
  });

  it('should render the admin select and email search', () => {
    expect(fixture.nativeElement.textContent).toContain('Usuário');
    expect(fixture.nativeElement.textContent).toContain(
      'Selecione um usuário da lista ou pesquise pelo e-mail exato caso ele não apareça.',
    );
    expect(fixture.nativeElement.textContent).toContain('Ou pesquise pelo e-mail exato');
    expect(fixture.nativeElement.textContent).toContain('Buscar usuário');
    expect(inputs()[0].placeholder).toBe('usuario@email.com');
  });

  it('should emit the selected list user and role in admin-list mode', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    selectOption(0, 1);
    selectOption(1, 1);

    submit();

    expect(submitted).toHaveBeenCalledWith({ userId: 2, role: 'EMPLOYEE' });
  });

  it('should emit an email search in admin-list mode', () => {
    const searchEmail = vi.fn();
    fixture.componentInstance.searchEmail.subscribe(searchEmail);

    setInput(0, ' ANA@example.com ');
    findButton('Buscar usuário')?.click();
    fixture.detectChanges();

    expect(searchEmail).toHaveBeenCalledWith('ana@example.com');
  });

  it('should use the found user as active selection and clear the list selection', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    selectOption(0, 1);

    fixture.componentRef.setInput('foundUser', foundUser);
    fixture.detectChanges();
    selectOption(1, 1);
    submit();

    expect(selects()[0].value).toBe('');
    expect(submitted).toHaveBeenCalledWith({ userId: 3, role: 'EMPLOYEE' });
  });

  it('should emit emailChanged when selecting from the admin list after a search', () => {
    fixture.componentRef.setInput('foundUser', foundUser);
    fixture.detectChanges();
    const emailChanged = vi.fn();
    fixture.componentInstance.emailChanged.subscribe(emailChanged);

    selectOption(0, 1);

    expect(emailChanged).toHaveBeenCalled();
  });

  it('should keep admin-list submit disabled without user and enable it with user plus role', () => {
    expect(findButton('Vincular')?.disabled).toBe(true);

    selectOption(0, 1);
    expect(findButton('Vincular')?.disabled).toBe(true);

    selectOption(1, 1);
    expect(findButton('Vincular')?.disabled).toBe(false);
  });

  it('should keep link submit disabled in email-search mode before finding a user', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('foundUser', null);
    fixture.detectChanges();

    expect(selects()).toHaveLength(1);
    expect(findButton('Vincular')?.disabled).toBe(true);
  });

  it('should enable link submit only after finding a user and selecting a role', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('foundUser', users[0]);
    fixture.detectChanges();

    expect(findButton('Vincular')?.disabled).toBe(true);

    selectOption(0, 1);

    expect(findButton('Vincular')?.disabled).toBe(false);
  });

  it('should emit an email search in email-search mode', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('foundUser', null);
    fixture.detectChanges();
    const searchEmail = vi.fn();
    fixture.componentInstance.searchEmail.subscribe(searchEmail);

    setInput(0, ' maria@example.com ');
    findButton('Buscar usuário')?.click();
    fixture.detectChanges();

    expect(searchEmail).toHaveBeenCalledWith('maria@example.com');
  });

  it('should render the found user and submit its id in email-search mode', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('foundUser', users[0]);
    fixture.detectChanges();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    expect(fixture.nativeElement.textContent).toContain('Maria Silva');
    expect(fixture.nativeElement.textContent).toContain('maria@example.com');
    expect(fixture.nativeElement.textContent).toContain('ACTIVE');
    expect(fixture.nativeElement.textContent).toContain('USER');

    selectOption(0, 1);
    submit();

    expect(submitted).toHaveBeenCalledWith({ userId: 2, role: 'EMPLOYEE' });
  });

  it('should emit emailChanged and disable submit when the searched email changes', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('foundUser', users[0]);
    fixture.detectChanges();
    selectOption(0, 1);
    const emailChanged = vi.fn();
    fixture.componentInstance.emailChanged.subscribe(emailChanged);

    expect(findButton('Vincular')?.disabled).toBe(false);

    setInput(0, 'outra@example.com');
    fixture.componentRef.setInput('foundUser', null);
    fixture.detectChanges();

    expect(emailChanged).toHaveBeenCalled();
    expect(findButton('Vincular')?.disabled).toBe(true);
  });

  it('should show search errors', () => {
    fixture.componentRef.setInput('searchError', 'Usuário não encontrado.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Usuário não encontrado.');
  });

  function setInput(index: number, value: string): void {
    const input = inputs()[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  function selectOption(index: number, selectedIndex: number): void {
    const select = selects()[index];
    select.selectedIndex = selectedIndex;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function inputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>);
  }

  function selects(): HTMLSelectElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>);
  }

  function submit(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }
});
