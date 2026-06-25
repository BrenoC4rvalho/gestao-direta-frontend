import { TestBed } from '@angular/core/testing';

import { FarmAccessResponse } from '../models/farm-access.models';

import { FarmAccessStore } from './farm-access.store';

const access: FarmAccessResponse = {
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  userId: 2,
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

describe('FarmAccessStore', () => {
  let store: FarmAccessStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(FarmAccessStore);
    store.clear();
  });

  it('should start without access or permissions', () => {
    expect(store.access()).toBeNull();
    expect(store.role()).toBeNull();
    expect(store.hasAccess()).toBe(false);
    expect(store.canEditFarm()).toBe(false);
    expect(store.canViewFinancial()).toBe(false);
    expect(Object.values(store.permissions()).every((permission) => !permission)).toBe(true);
  });

  it('should expose access, role and permissions', () => {
    store.setAccess(access);

    expect(store.access()).toEqual(access);
    expect(store.role()).toBe('PRODUCER');
    expect(store.hasAccess()).toBe(true);
    expect(store.canEditFarm()).toBe(true);
    expect(store.canViewFinancial()).toBe(true);
    expect(store.canChangeFarmStatus()).toBe(false);
  });

  it('should store loading and error state', () => {
    store.setLoading(true);
    store.setError('Falha');

    expect(store.loading()).toBe(true);
    expect(store.error()).toBe('Falha');
  });

  it('should clear access and return safe permissions', () => {
    store.setAccess(access);
    store.setLoading(true);
    store.setError('Falha');

    store.clear();

    expect(store.access()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.canEditFarm()).toBe(false);
    expect(store.canViewFinancial()).toBe(false);
  });
});
