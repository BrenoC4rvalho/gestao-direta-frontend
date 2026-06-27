import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { User } from '../../core/models/user.models';

import { ProfilePage } from './profile-page';

interface ProfilePageHarness {
  profileForm: {
    controls: {
      name: { setValue(value: string): void; value: string | null; hasError(error: string): boolean };
      email: { value: string | null };
      document: { setValue(value: string): void; value: string | null };
    };
    invalid: boolean;
  };
  passwordForm: {
    controls: {
      currentPassword: { setValue(value: string): void; value: string | null; hasError(error: string): boolean };
      newPassword: { setValue(value: string): void; value: string | null; hasError(error: string): boolean };
      confirmPassword: { setValue(value: string): void; value: string | null; hasError(error: string): boolean };
    };
    invalid: boolean;
  };
  saveProfile(): void;
  changePassword(): void;
}

const user: User = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: '12345678900',
  userType: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const updatedUser: User = {
  ...user,
  name: 'Maria Souza',
  document: null,
  updatedAt: '2026-01-11T00:00:00Z',
};

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let userService: {
    getMe: ReturnType<typeof vi.fn>;
    updateMe: ReturnType<typeof vi.fn>;
  };
  let authService: {
    changePassword: ReturnType<typeof vi.fn>;
  };
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    userService = {
      getMe: vi.fn().mockReturnValue(of(user)),
      updateMe: vi.fn().mockReturnValue(of(updatedUser)),
    };
    authService = {
      changePassword: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    sessionStore.clear();
    toastStore.clear();
  });

  afterEach(() => {
    sessionStore.clear();
    toastStore.clear();
  });

  function createPage(): ProfilePageHarness {
    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as ProfilePageHarness;
  }

  it('should render title and load authenticated user profile', () => {
    const component = createPage();

    expect(fixture.nativeElement.textContent).toContain('Minha conta');
    expect(userService.getMe).toHaveBeenCalled();
    expect(component.profileForm.controls.name.value).toBe('Maria Silva');
    expect(component.profileForm.controls.email.value).toBe('maria@example.com');
    expect(component.profileForm.controls.document.value).toBe('12345678900');
  });

  it('should render readonly email and translated badges', () => {
    createPage();

    const email = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement | null;

    expect(email).not.toBeNull();
    expect(email?.readOnly).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Administrador');
    expect(fixture.nativeElement.textContent).toContain('Ativo');
  });

  it('should validate required name', () => {
    const component = createPage();

    component.profileForm.controls.name.setValue('   ');
    component.saveProfile();
    fixture.detectChanges();

    expect(component.profileForm.controls.name.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe seu nome.');
    expect(userService.updateMe).not.toHaveBeenCalled();
  });

  it('should save profile with trimmed name and null document when empty', () => {
    const component = createPage();

    component.profileForm.controls.name.setValue('  Maria Souza  ');
    component.profileForm.controls.document.setValue('   ');
    component.saveProfile();
    fixture.detectChanges();

    expect(userService.updateMe).toHaveBeenCalledWith({
      name: 'Maria Souza',
      document: null,
    });
  });

  it('should show success toast, update session and repopulate profile form', () => {
    const component = createPage();
    const setUser = vi.spyOn(sessionStore, 'setUser');

    component.profileForm.controls.name.setValue('Maria Souza');
    component.profileForm.controls.document.setValue('');
    component.saveProfile();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe('Perfil atualizado com sucesso.');
    expect(setUser).toHaveBeenCalledWith(updatedUser);
    expect(component.profileForm.controls.name.value).toBe('Maria Souza');
    expect(component.profileForm.controls.document.value).toBe('');
  });

  it('should show profile validation toast on 400 error', () => {
    userService.updateMe.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    const component = createPage();

    component.profileForm.controls.name.setValue('Maria Souza');
    component.saveProfile();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe('Verifique os dados informados.');
  });

  it('should show load error state and retry loading profile', () => {
    userService.getMe
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of(user));

    createPage();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar seu perfil');
    expect(toastStore.toasts()[0]?.title).toBe('Não foi possível carregar seu perfil.');

    clickButton('Tentar novamente');
    fixture.detectChanges();

    expect(userService.getMe).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Dados do perfil');
  });

  it('should validate required current password', () => {
    const component = createPage();

    component.passwordForm.controls.newPassword.setValue('new-secret');
    component.passwordForm.controls.confirmPassword.setValue('new-secret');
    component.changePassword();
    fixture.detectChanges();

    expect(component.passwordForm.controls.currentPassword.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe sua senha atual.');
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('should validate new password minimum length', () => {
    const component = createPage();

    component.passwordForm.controls.currentPassword.setValue('old-secret');
    component.passwordForm.controls.newPassword.setValue('short');
    component.passwordForm.controls.confirmPassword.setValue('short');
    component.changePassword();
    fixture.detectChanges();

    expect(component.passwordForm.controls.newPassword.hasError('minlength')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('A nova senha deve ter pelo menos 8 caracteres.');
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('should validate confirmation matching new password', () => {
    const component = createPage();

    component.passwordForm.controls.currentPassword.setValue('old-secret');
    component.passwordForm.controls.newPassword.setValue('new-secret');
    component.passwordForm.controls.confirmPassword.setValue('different');
    component.changePassword();
    fixture.detectChanges();

    expect(component.passwordForm.controls.confirmPassword.hasError('passwordMismatch')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('As senhas não conferem.');
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('should change password without confirmPassword in payload', () => {
    const component = createPage();

    component.passwordForm.controls.currentPassword.setValue('old-secret');
    component.passwordForm.controls.newPassword.setValue('new-secret');
    component.passwordForm.controls.confirmPassword.setValue('new-secret');
    component.changePassword();
    fixture.detectChanges();

    expect(authService.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });
  });

  it('should show success toast and clear password form', () => {
    const component = createPage();

    component.passwordForm.controls.currentPassword.setValue('old-secret');
    component.passwordForm.controls.newPassword.setValue('new-secret');
    component.passwordForm.controls.confirmPassword.setValue('new-secret');
    component.changePassword();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe('Senha alterada com sucesso.');
    expect(component.passwordForm.controls.currentPassword.value).toBe('');
    expect(component.passwordForm.controls.newPassword.value).toBe('');
    expect(component.passwordForm.controls.confirmPassword.value).toBe('');
  });

  it('should show change password validation toast on 400 error', () => {
    authService.changePassword.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    const component = createPage();

    component.passwordForm.controls.currentPassword.setValue('old-secret');
    component.passwordForm.controls.newPassword.setValue('new-secret');
    component.passwordForm.controls.confirmPassword.setValue('new-secret');
    component.changePassword();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe('Verifique a senha atual e a nova senha.');
  });

  function clickButton(label: string): void {
    const button = findButton(fixture.nativeElement, label);
    button?.click();
  }

  function findButton(element: HTMLElement, label: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  }
});
