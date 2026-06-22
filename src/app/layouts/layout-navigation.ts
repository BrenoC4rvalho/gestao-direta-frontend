export interface LayoutNavItem {
  label: string;
  route: string;
  icon: string;
}

export const MAIN_NAV_ITEMS: readonly LayoutNavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'layout-dashboard' },
  { label: 'Fazendas', route: '/farms', icon: 'tractor' },
  { label: 'Usuários', route: '/users', icon: 'users' },
  { label: 'Vínculos', route: '/farm-users', icon: 'user-round-cog' },
  { label: 'Categorias', route: '/categories', icon: 'tags' },
  { label: 'Movimentações', route: '/transactions', icon: 'receipt-text' },
  { label: 'Contas a vencer', route: '/upcoming-bills', icon: 'calendar-clock' },
  { label: 'Perfil', route: '/profile', icon: 'user' },
];
