import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';

import { PeopleManagementPage } from './people-management-page';

@Component({ template: '' })
class PageStub {}

@Component({
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RouterHost {}

describe('PeopleManagementPage', () => {
  let fixture: ComponentFixture<RouterHost>;
  let router: Router;
  let sessionStore: SessionStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterHost],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          {
            path: 'people',
            component: PeopleManagementPage,
            children: [
              { path: 'users', component: PageStub },
              { path: 'farm-users', component: PageStub },
            ],
          },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    sessionStore = TestBed.inject(SessionStore);
    TestBed.inject(FarmAccessStore).clear();
    TestBed.inject(SelectedFarmStore).clear();
    sessionStore.clear();
    sessionStore.setUser({
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      document: null,
      userType: 'ADMIN',
      status: 'ACTIVE',
    });

    fixture = TestBed.createComponent(RouterHost);
    fixture.detectChanges();
  });

  it('should render compact tab links with icons and a router outlet', async () => {
    await router.navigateByUrl('/people/users');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const navigation = element.querySelector('nav');
    const links = element.querySelectorAll('a');

    expect(navigation?.getAttribute('aria-label')).toBe('Seções de usuários e vínculos');
    expect(navigation?.className).toContain('inline-flex');
    expect(navigation?.className).not.toContain('grid');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/people/users');
    expect(links[1].getAttribute('href')).toBe('/people/farm-users');
    expect(element.querySelectorAll('svg[lucideIcon]')).toHaveLength(2);
    expect(element.querySelector('gd-people-management-page router-outlet')).toBeTruthy();
  });

  it('should indicate the active tab with text, aria-current and an underline only', async () => {
    await router.navigateByUrl('/people/farm-users');
    await fixture.whenStable();
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const activeLink = links[1];

    expect(activeLink.className).toContain('text-text-primary');
    expect(activeLink.className).toContain('font-semibold');
    expect(activeLink.className).not.toContain('bg-primary');
    expect(activeLink.getAttribute('aria-current')).toBe('page');
    expect(activeLink.querySelector('.bg-primary')).toBeTruthy();
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[0].querySelector('.bg-primary')).toBeNull();
  });
});
