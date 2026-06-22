import { TestBed } from '@angular/core/testing';

import { AuthUser } from '../models/auth.models';

import { SessionStore } from './session.store';

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('SessionStore', () => {
  it('should define and clear user state', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(SessionStore);

    store.setUser(user);
    store.setInitialized(true);

    expect(store.user()).toEqual(user);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.userName()).toBe('Maria Silva');
    expect(store.userEmail()).toBe('maria@example.com');
    expect(store.userType()).toBe('ADMIN');
    expect(store.isAdmin()).toBe(true);

    store.clear();

    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.initialized()).toBe(true);
  });
});
