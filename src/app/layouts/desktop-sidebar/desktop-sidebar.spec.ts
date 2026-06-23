import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { DesktopSidebar } from './desktop-sidebar';

@Component({
  template: '',
})
class LoginStub {}

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('DesktopSidebar', () => {
  let fixture: ComponentFixture<DesktopSidebar>;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    authService = {
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DesktopSidebar],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: 'login', component: LoginStub }]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    toastStore.clear();
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);

    fixture = TestBed.createComponent(DesktopSidebar);
    fixture.detectChanges();
  });

  afterEach(() => {
    toastStore.clear();
  });

  it('should render the main navigation links', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Dashboard');
    expect(text).toContain('Fazendas');
    expect(text).toContain('Usuários');
    expect(text).toContain('Movimentações');
    expect(text).toContain('Contas a vencer');
    expect(text).toContain('Perfil');
  });

  it('should render authenticated user name, email and initials', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('MS');
  });

  it('should logout, clear session, navigate to login and show success toast', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(sessionStore.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.title).toBe('Sessão encerrada.');
  });

  it('should clear local session and navigate to login when logout fails', () => {
    authService.logout.mockReturnValueOnce(throwError(() => new Error('logout failed')));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(sessionStore.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.type).toBe('info');
    expect(toastStore.toasts()[0]?.title).toBe('Sessão local encerrada.');
  });
});
