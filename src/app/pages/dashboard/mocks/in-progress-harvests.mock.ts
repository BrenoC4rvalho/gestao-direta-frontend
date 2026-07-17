export interface DashboardHarvestMock {
  id: number;
  name: string;
  status: 'IN_PROGRESS';
  productionActivityName: string;
  realized: {
    cost: number;
    revenue: number;
    profit: number;
  };
  projection: {
    cost: number;
    revenue: number;
    profit: number;
  };
  dueNext7Days: {
    count: number;
    totalAmount: number;
  };
  overdue: {
    count: number;
    totalAmount: number;
  };
}

export const DASHBOARD_IN_PROGRESS_HARVESTS_MOCK: readonly DashboardHarvestMock[] = [
  {
    id: 25,
    name: 'Café 2026/2027',
    status: 'IN_PROGRESS',
    productionActivityName: 'Café',
    realized: { cost: 40000, revenue: 50000, profit: 10000 },
    projection: { cost: 68000, revenue: 132000, profit: 64000 },
    dueNext7Days: { count: 2, totalAmount: 10000 },
    overdue: { count: 0, totalAmount: 0 },
  },
  {
    id: 26,
    name: 'Tomate 2025/2026',
    status: 'IN_PROGRESS',
    productionActivityName: 'Tomate',
    realized: { cost: 102700, revenue: 30500, profit: -72200 },
    projection: { cost: 136100, revenue: 88500, profit: -47600 },
    dueNext7Days: { count: 3, totalAmount: 33400 },
    overdue: { count: 2, totalAmount: 27100 },
  },
  {
    id: 27,
    name: 'Milho 2024/2025',
    status: 'IN_PROGRESS',
    productionActivityName: 'Milho',
    realized: { cost: 175900, revenue: 129000, profit: -46900 },
    projection: { cost: 205000, revenue: 230000, profit: 25000 },
    dueNext7Days: { count: 1, totalAmount: 8500 },
    overdue: { count: 1, totalAmount: 5900 },
  },
];
