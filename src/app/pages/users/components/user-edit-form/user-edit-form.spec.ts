import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { User } from '../../../../core/models/user.models';

import { UserEditForm } from './user-edit-form';

const user: User = {
  id: 2,
  name: 'João Souza',
  email: 'joao@example.com',
  document: '123.456.789-00',
  userType: 'USER',
  status: 'BLOCKED',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-11T00:00:00Z',
};

describe('UserEditForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserEditForm],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should render user fields and readonly access data', () => {
    const fixture = createForm(user);

    expect(getInput(fixture.nativeElement, 0).value).toBe('João Souza');
    expect(getInput(fixture.nativeElement, 1).value).toBe('joao@example.com');
    expect(getInput(fixture.nativeElement, 1).disabled).toBe(true);
    expect(getInput(fixture.nativeElement, 2).value).toBe('123.456.789-00');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Usuário');
    expect(text).toContain('Bloqueado');
  });

  it('should validate name before emitting profile save', () => {
    const fixture = createForm(user);
    const saveProfile = vi.fn();
    fixture.componentInstance.saveProfile.subscribe(saveProfile);

    setInput(fixture.nativeElement, 0, '');
    submitForm(fixture.nativeElement, 0);
    fixture.detectChanges();

    expect(saveProfile).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Informe o nome do usuário.');
  });

  it('should emit normalized profile payload', () => {
    const fixture = createForm(user);
    const saveProfile = vi.fn();
    fixture.componentInstance.saveProfile.subscribe(saveProfile);

    setInput(fixture.nativeElement, 0, ' João Atualizado ');
    setInput(fixture.nativeElement, 2, ' ');
    submitForm(fixture.nativeElement, 0);

    expect(saveProfile).toHaveBeenCalledWith({
      name: 'João Atualizado',
      document: null,
    });
  });

  it('should render available status actions without the current status', () => {
    const fixture = createForm(user);

    expect(findButton(fixture.nativeElement, 'Ativar')).toBeTruthy();
    expect(findButton(fixture.nativeElement, 'Inativar')).toBeTruthy();
    expect(findButton(fixture.nativeElement, 'Bloquear')).toBeUndefined();
  });

  it('should emit status and type actions', () => {
    const fixture = createForm(user);
    const changeStatus = vi.fn();
    const changeType = vi.fn();
    fixture.componentInstance.changeStatus.subscribe(changeStatus);
    fixture.componentInstance.changeType.subscribe(changeType);

    findButton(fixture.nativeElement, 'Ativar')?.click();
    findButton(fixture.nativeElement, 'Tornar administrador')?.click();

    expect(changeStatus).toHaveBeenCalledWith('ACTIVE');
    expect(changeType).toHaveBeenCalledWith('ADMIN');
  });

  it('should protect access actions and password reset for the current user', () => {
    const fixture = createForm({ ...user, userType: 'ADMIN', status: 'ACTIVE' }, true);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sua própria permissão administrativa está protegida.');
    expect(text).toContain('Você não pode bloquear ou inativar sua própria conta.');
    expect(text).toContain('Para alterar sua própria senha, acesse Minha conta.');
    expect(findButton(fixture.nativeElement, 'Tornar usuário')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Bloquear')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Resetar senha')).toBeUndefined();
  });

  it('should validate temporary password length', () => {
    const fixture = createForm(user);
    const resetPassword = vi.fn();
    fixture.componentInstance.resetPassword.subscribe(resetPassword);

    setInput(fixture.nativeElement, 3, '1234567');
    submitForm(fixture.nativeElement, 1);
    fixture.detectChanges();

    expect(resetPassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'A senha deve ter pelo menos 8 caracteres.',
    );
  });

  it('should emit password reset and clear password on command', () => {
    const fixture = createForm(user);
    const resetPassword = vi.fn();
    fixture.componentInstance.resetPassword.subscribe(resetPassword);

    setInput(fixture.nativeElement, 3, ' password123 ');
    submitForm(fixture.nativeElement, 1);

    expect(resetPassword).toHaveBeenCalledWith('password123');

    fixture.componentInstance.clearPassword();
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, 3).value).toBe('');
  });
});

function createForm(userInput: User, isCurrentUser = false) {
  const fixture = TestBed.createComponent(UserEditForm);
  fixture.componentRef.setInput('user', userInput);
  fixture.componentRef.setInput('isCurrentUser', isCurrentUser);
  fixture.detectChanges();
  return fixture;
}

function getInput(root: HTMLElement, index: number): HTMLInputElement {
  return root.querySelectorAll<HTMLInputElement>('gd-input input')[index];
}

function setInput(root: HTMLElement, index: number, value: string): void {
  const input = getInput(root, index);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(root: HTMLElement, index: number): void {
  root.querySelectorAll<HTMLFormElement>('form')[index].dispatchEvent(new Event('submit'));
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
