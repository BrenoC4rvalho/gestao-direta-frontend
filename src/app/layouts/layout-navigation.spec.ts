import { FarmAccessPermissions } from '../core/models/farm-access.models';

import { getVisibleNavItems, MAIN_NAV_ITEMS } from './layout-navigation';

const allPermissions: FarmAccessPermissions = {
  canViewFarm: true,
  canEditFarm: true,
  canChangeFarmStatus: true,
  canManageFarmUsers: true,
  canViewFinancial: true,
  canManageTransactions: true,
  canManageCategories: true,
  canManageGlobalCategories: true,
  canCreateFarm: true,
};

const noPermissions: FarmAccessPermissions = {
  canViewFarm: false,
  canEditFarm: false,
  canChangeFarmStatus: false,
  canManageFarmUsers: false,
  canViewFinancial: false,
  canManageTransactions: false,
  canManageCategories: false,
  canManageGlobalCategories: false,
  canCreateFarm: false,
};

const adminLabels = [
  'Dashboard',
  'Fazendas',
  'Usuários e vínculos',
  'Categorias',
  'Atividades produtivas',
  'Movimentações',
  'Safras',
  'Agenda financeira',
];

const allLabels = [
  'Dashboard',
  'Fazendas',
  'Usuários e vínculos',
  'Categorias',
  'Movimentações',
  'Safras',
  'Agenda financeira',
];

const financialLabels = [
  'Dashboard',
  'Fazendas',
  'Movimentações',
  'Safras',
  'Agenda financeira',
];

describe('layout navigation visibility', () => {
  it('should show all navigation items for an admin without selected farm access', () => {
    expect(
      getLabels({
        userType: 'ADMIN',
        role: null,
        permissions: null,
        hasSelectedFarm: false,
      }),
    ).toEqual(adminLabels);
  });

  it('should show all navigation items for a producer with management permissions', () => {
    expect(
      getLabels({
        userType: 'USER',
        role: 'PRODUCER',
        permissions: {
          ...noPermissions,
          canManageFarmUsers: true,
          canViewFinancial: true,
          canManageTransactions: true,
          canManageCategories: true,
        },
        hasSelectedFarm: true,
      }),
    ).toEqual(allLabels);
  });

  it('should show only operational financial items for an employee', () => {
    expect(
      getLabels({
        userType: 'USER',
        role: 'EMPLOYEE',
        permissions: {
          ...noPermissions,
          canViewFinancial: true,
          canManageTransactions: true,
        },
        hasSelectedFarm: true,
      }),
    ).toEqual(financialLabels);
  });

  it('should show only financial consultation items for an accountant', () => {
    expect(
      getLabels({
        userType: 'USER',
        role: 'ACCOUNTANT',
        permissions: {
          ...noPermissions,
          canViewFinancial: true,
        },
        hasSelectedFarm: true,
      }),
    ).toEqual(financialLabels);
  });

  it('should show at most safe items for a regular user without farm access', () => {
    expect(
      getLabels({
        userType: 'USER',
        role: null,
        permissions: null,
        hasSelectedFarm: false,
      }),
    ).toEqual(['Dashboard', 'Fazendas']);
  });

  it('should update visible items when the farm access context changes', () => {
    const producerLabels = getLabels({
      userType: 'USER',
      role: 'PRODUCER',
      permissions: allPermissions,
      hasSelectedFarm: true,
    });
    const employeeLabels = getLabels({
      userType: 'USER',
      role: 'EMPLOYEE',
      permissions: {
        ...noPermissions,
        canViewFinancial: true,
        canManageTransactions: true,
      },
      hasSelectedFarm: true,
    });

    expect(producerLabels).toEqual(allLabels);
    expect(employeeLabels).toEqual(financialLabels);
  });
});

function getLabels(context: Parameters<typeof getVisibleNavItems>[1]): string[] {
  return getVisibleNavItems(MAIN_NAV_ITEMS, context).map((item) => item.label);
}
