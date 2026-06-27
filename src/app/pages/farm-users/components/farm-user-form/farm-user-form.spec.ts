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

    expect(fixture.nativeElement.textContent).toContain('Selecione um usuário.');
    expect(fixture.nativeElement.textContent).toContain('Selecione o papel na fazenda.');
  });

  it('should emit the selected user and role', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    selectOption(0, 1);
    selectOption(1, 1);

    submit();

    expect(submitted).toHaveBeenCalledWith({ userId: 2, role: 'EMPLOYEE' });
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

    selectOption(0, 1);
    submit();

    expect(submitted).toHaveBeenCalledWith({ userId: 2, role: 'EMPLOYEE' });
  });

  it('should show search errors in email-search mode', () => {
    fixture.componentRef.setInput('mode', 'email-search');
    fixture.componentRef.setInput('searchError', 'Usuário não encontrado.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Usuário não encontrado.');
  });


  function setInput(index: number, value: string): void {
    const input = fixture.nativeElement.querySelectorAll('input')[index] as HTMLInputElement;
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
    const select = fixture.nativeElement.querySelectorAll('select')[index] as HTMLSelectElement;
    select.selectedIndex = selectedIndex;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }
});
