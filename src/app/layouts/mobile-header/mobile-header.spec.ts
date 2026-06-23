import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { MobileHeader } from './mobile-header';

@Component({
  template: '',
})
class LoginStub {}

@Component({
  template: '',
})
class DashboardStub {}

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('MobileHeader', () => {
  let fixture: ComponentFixture<MobileHeader>;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    authService = {
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [MobileHeader],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'dashboard', component: DashboardStub },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    toastStore.clear();
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);

    fixture = TestBed.createComponent(MobileHeader);
    fixture.detectChanges();
  });

  afterEach(() => {
    toastStore.clear();
  });

  it('should render menu button and open drawer', () => {
    const menuButton = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu de navegação"]',
    ) as HTMLButtonElement;

    expect(menuButton).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    menuButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Menu');
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('should render authenticated user name, email and initials in the drawer', () => {
    openDrawer();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('MS');
  });

  it('should close drawer when a navigation link is clicked', () => {
    openDrawer();

    const dashboardLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Dashboard'));

    dashboardLink?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should logout, close drawer, clear session, navigate to login and show success toast', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.title).toBe('Sessão encerrada.');
  });

  it('should close drawer, clear local session and navigate to login when logout fails', () => {
    authService.logout.mockReturnValueOnce(throwError(() => new Error('logout failed')));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.type).toBe('info');
    expect(toastStore.toasts()[0]?.title).toBe('Sessão local encerrada.');
  });

  function openDrawer(): void {
    const menuButton = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu de navegação"]',
    ) as HTMLButtonElement;

    menuButton.click();
    fixture.detectChanges();
  }

  function clickLogout(): void {
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();
  }
});
