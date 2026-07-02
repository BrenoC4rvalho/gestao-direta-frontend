import type { UserType } from '../core/models/auth.models';
import type { FarmAccessPermissions } from '../core/models/farm-access.models';
import type { FarmUserRole } from '../core/models/farm-user.models';

export type LayoutNavVisibility =
  | 'authenticated'
  | 'manageFarmUsers'
  | 'manageCategories'
  | 'viewFinancial';

export interface LayoutNavItem {
  label: string;
  route: string;
  icon: string;
  visibility: LayoutNavVisibility;
}

export interface LayoutNavVisibilityContext {
  userType: UserType | null;
  role: FarmUserRole | null;
  permissions: FarmAccessPermissions | null;
  hasSelectedFarm: boolean;
}

export const MAIN_NAV_ITEMS: readonly LayoutNavItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'layout-dashboard',
    visibility: 'authenticated',
  },
  { label: 'Fazendas', route: '/farms', icon: 'tractor', visibility: 'authenticated' },
  { label: 'Usuários', route: '/users', icon: 'users', visibility: 'manageFarmUsers' },
  {
    label: 'Vínculos',
    route: '/farm-users',
    icon: 'user-round-cog',
    visibility: 'manageFarmUsers',
  },
  { label: 'Categorias', route: '/categories', icon: 'tags', visibility: 'manageCategories' },
  {
    label: 'Movimentações',
    route: '/transactions',
    icon: 'receipt-text',
    visibility: 'viewFinancial',
  },
  {
    label: 'Safras',
    route: '/harvests',
    icon: 'sprout',
    visibility: 'viewFinancial',
  },
  {
    label: 'Contas a vencer',
    route: '/upcoming-bills',
    icon: 'calendar-clock',
    visibility: 'viewFinancial',
  },
];

export function getVisibleNavItems(
  items: readonly LayoutNavItem[],
  context: LayoutNavVisibilityContext,
): LayoutNavItem[] {
  return items.filter((item) => canShowNavItem(item, context));
}

export function canShowNavItem(
  item: LayoutNavItem,
  context: LayoutNavVisibilityContext,
): boolean {
  if (!context.userType) {
    return false;
  }

  if (item.visibility === 'authenticated') {
    return true;
  }

  if (context.userType === 'ADMIN') {
    return true;
  }

  if (!context.hasSelectedFarm || !context.permissions) {
    return false;
  }

  if (item.route === '/users' && context.role === 'PRODUCER') {
    return true;
  }

  switch (item.visibility) {
    case 'manageFarmUsers':
      return context.permissions.canManageFarmUsers;
    case 'manageCategories':
      return (
        context.permissions.canManageCategories ||
        context.permissions.canManageGlobalCategories
      );
    case 'viewFinancial':
      return context.permissions.canViewFinancial;
  }
}
