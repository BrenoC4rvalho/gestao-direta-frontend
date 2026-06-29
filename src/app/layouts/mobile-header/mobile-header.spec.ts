import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ThemeStore } from '../../core/stores/theme.store';
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

@Component({
  template: '',
})
class ProfileStub {}

const drawerAnimationDurationMs = 250;

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};


const producerUser: AuthUser = {
  ...user,
  userType: 'USER',
};

const producerAccess = {
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 1,
  userType: 'USER',
  role: 'PRODUCER',
  permissions: {
    canViewFarm: true,
    canEditFarm: true,
    canChangeFarmStatus: false,
    canManageFarmUsers: true,
    canViewFinancial: true,
    canManageTransactions: true,
    canManageCategories: true,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

const selectedFarm = {
  id: 10,
  name: 'Fazenda Boa Safra',
  document: null,
  city: null,
  state: null,
  totalArea: null,
  productionType: null,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('MobileHeader', () => {
  let fixture: ComponentFixture<MobileHeader>;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  let farmAccessStore: FarmAccessStore;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;
  let themeStore: ThemeStore;
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
          { path: 'profile', component: ProfileStub },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    themeStore = TestBed.inject(ThemeStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    toastStore.clear();
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);

    fixture = TestBed.createComponent(MobileHeader);
    fixture.detectChanges();
  });

  afterEach(() => {
    farmAccessStore.clear();
    selectedFarmStore.clear();
    toastStore.clear();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should render the mobile brand logo', () => {
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(image).toBeTruthy();
    expect(image.getAttribute('src')).toContain('/assets/brand/logo-mark.svg');
    expect(image.getAttribute('alt')).toBe('Gestão Direta');
  });

  it('should open the menu drawer', () => {
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
    expect(fixture.nativeElement.querySelector('gd-farm-context-selector')).toBeNull();
  });


  it('should render Users for a producer with farm user management permission', () => {
    sessionStore.setUser(producerUser);
    selectedFarmStore.selectFarm(selectedFarm);
    farmAccessStore.setAccess(producerAccess);
    fixture.detectChanges();
    openDrawer();

    expect(fixture.nativeElement.textContent).toContain('Usuários');
  });

  it('should hide Users for an employee without farm user management permission', () => {
    sessionStore.setUser(producerUser);
    selectedFarmStore.selectFarm(selectedFarm);
    farmAccessStore.setAccess({
      ...producerAccess,
      role: 'EMPLOYEE',
      permissions: { ...producerAccess.permissions, canManageFarmUsers: false },
    });
    fixture.detectChanges();
    openDrawer();

    expect(fixture.nativeElement.textContent).not.toContain('Usuários');
  });

  it('should render authenticated user as a profile link in the drawer', () => {
    openDrawer();

    const text = fixture.nativeElement.textContent as string;
    const profileLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Maria Silva'));

    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('MS');
    expect(profileLink?.getAttribute('href')).toBe('/profile');
  });

  it('should render the theme toggle button in the drawer', () => {
    openDrawer();

    const themeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Alternar tema"]',
    ) as HTMLButtonElement;

    expect(themeButton).toBeTruthy();
    expect(themeButton.getAttribute('title')).toBe('Alternar tema');
    expect(themeButton.textContent).toContain('Modo escuro');

    themeStore.setTheme('dark');
    fixture.detectChanges();

    expect(themeButton.textContent).toContain('Modo claro');
  });

  it('should toggle the theme from the drawer button', () => {
    const toggleTheme = vi.spyOn(themeStore, 'toggleTheme');
    openDrawer();

    const themeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Alternar tema"]',
    ) as HTMLButtonElement;

    themeButton.click();

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should close drawer when a navigation link is clicked', async () => {
    openDrawer();

    const dashboardLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Dashboard'));

    dashboardLink?.click();
    fixture.detectChanges();
    await finishDrawerClose();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should close drawer when the authenticated user profile link is clicked', async () => {
    openDrawer();

    const profileLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Maria Silva'));

    profileLink?.click();
    fixture.detectChanges();
    await finishDrawerClose();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should logout, close drawer, clear session and farm context, navigate to login and show success toast', async () => {
    const clearAccess = vi.spyOn(farmAccessStore, 'clear');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();
    await finishDrawerClose();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(clearAccess).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.title).toBe('Sessão encerrada.');
  });

  it('should close drawer and clear local session and farm context when logout fails', async () => {
    authService.logout.mockReturnValueOnce(throwError(() => new Error('logout failed')));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();
    await finishDrawerClose();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
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

  async function finishDrawerClose(): Promise<void> {
    await wait(drawerAnimationDurationMs + 10);
    fixture.detectChanges();
  }

  function clickLogout(): void {
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();
  }
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
