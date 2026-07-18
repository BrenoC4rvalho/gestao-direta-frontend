import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterOutlet, provideRouter } from '@angular/router';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterHost],
      providers: [
        provideRouter([
          {
            path: 'people',
            component: PeopleManagementPage,
            children: [{ path: 'users', component: PageStub }],
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouterHost);
  });

  it('declares a router outlet for people-management child pages', () => {
    const component = TestBed.createComponent(PeopleManagementPage);
    component.detectChanges();

    expect(component.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });
});
