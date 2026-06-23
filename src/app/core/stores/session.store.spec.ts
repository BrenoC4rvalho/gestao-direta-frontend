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
  let store: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SessionStore);
  });

  it('should define user state', () => {
    store.setUser(user);
    store.setInitialized(true);

    expect(store.user()).toEqual(user);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.userName()).toBe('Maria Silva');
    expect(store.userEmail()).toBe('maria@example.com');
    expect(store.userType()).toBe('ADMIN');
    expect(store.isAdmin()).toBe(true);
    expect(store.initials()).toBe('MS');
  });

  it('should clear user state and keep the session initialized', () => {
    store.setUser(user);
    store.setLoading(true);

    store.clear();

    expect(store.user()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.initialized()).toBe(true);
    expect(store.initials()).toBeNull();
  });

  it('should build initials from full names, single names and email fallback', () => {
    store.setUser({ ...user, name: '  Maria   Aparecida   Silva  ' });
    expect(store.initials()).toBe('MS');

    store.setUser({ ...user, name: 'Pedro' });
    expect(store.initials()).toBe('PE');

    store.setUser({ ...user, name: '', email: 'ana@example.com' });
    expect(store.initials()).toBe('AN');
  });

  it('should return null initials without a valid user base', () => {
    store.setUser(null);
    expect(store.initials()).toBeNull();

    store.setUser({ ...user, name: '', email: '' });
    expect(store.initials()).toBeNull();
  });
});
