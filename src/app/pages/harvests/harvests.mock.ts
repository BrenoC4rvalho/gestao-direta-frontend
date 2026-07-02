export type HarvestStatus = 'IN_PRODUCTION' | 'PLANNED' | 'FINISHED';
export type HarvestHistoryType = 'INCOME' | 'EXPENSE' | 'INFO';

export interface HarvestSummary {
  activeSeasons: number;
  inProduction: number;
  totalCost: number;
  expectedRevenue: number;
  estimatedProfit: number;
}

export interface HarvestListItem {
  id: number;
  name: string;
  areaHectares: number;
  phase: string;
  status: HarvestStatus;
  progress: number;
  accumulatedCost: number;
  expectedRevenue: number;
  estimatedProfit: number;
  tags: readonly string[];
}

export interface HarvestHistoryItem {
  id: number;
  description: string;
  harvestName: string;
  category: string;
  date: string;
  amount: number | null;
  type: HarvestHistoryType;
}

export const harvestSummaryMock: HarvestSummary = {
  activeSeasons: 3,
  inProduction: 2,
  totalCost: 96500,
  expectedRevenue: 210000,
  estimatedProfit: 113500,
};

export const harvestsMock: readonly HarvestListItem[] = [
  {
    id: 1,
    name: 'Safra Soja 2025/26',
    areaHectares: 120,
    phase: 'Plantio concluído',
    status: 'IN_PRODUCTION',
    progress: 68,
    accumulatedCost: 42500,
    expectedRevenue: 85000,
    estimatedProfit: 42500,
    tags: ['Diesel', 'Insumos', 'Mão de obra', 'Venda futura'],
  },
  {
    id: 2,
    name: 'Safra Milho 2025/26',
    areaHectares: 80,
    phase: 'Adubação',
    status: 'IN_PRODUCTION',
    progress: 54,
    accumulatedCost: 28000,
    expectedRevenue: 52000,
    estimatedProfit: 24000,
    tags: ['Diesel', 'Insumos', 'Mão de obra'],
  },
  {
    id: 3,
    name: 'Safra Feijão 2025/26',
    areaHectares: 40,
    phase: 'Pré-plantio',
    status: 'PLANNED',
    progress: 18,
    accumulatedCost: 26000,
    expectedRevenue: 73000,
    estimatedProfit: 47000,
    tags: ['Insumos', 'Mão de obra', 'Venda futura'],
  },
];

export const harvestHistoryMock: readonly HarvestHistoryItem[] = [
  {
    id: 1,
    description: 'Compra de diesel',
    harvestName: 'Safra Soja',
    category: 'Combustível',
    date: '2026-04-05',
    amount: -200,
    type: 'EXPENSE',
  },
  {
    id: 2,
    description: 'Venda futura registrada',
    harvestName: 'Safra Soja',
    category: 'Receita',
    date: '2026-04-04',
    amount: 18000,
    type: 'INCOME',
  },
  {
    id: 3,
    description: 'Compra de fertilizante',
    harvestName: 'Safra Milho',
    category: 'Insumos',
    date: '2026-04-02',
    amount: -1200,
    type: 'EXPENSE',
  },
  {
    id: 4,
    description: 'Cadastro da nova safra',
    harvestName: 'Safra Feijão',
    category: 'Planejamento',
    date: '2026-04-01',
    amount: null,
    type: 'INFO',
  },
];
