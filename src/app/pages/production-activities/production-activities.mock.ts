export type ProductionActivityStatus = 'ACTIVE' | 'INACTIVE';
export type ProductionActivityType = 'AGRICULTURE' | 'LIVESTOCK' | 'MIXED' | 'OTHER';

export interface ProductionActivitySummary {
  total: number;
  active: number;
  inactive: number;
  mostUsedName: string;
}

export interface ProductionActivityListItem {
  id: number;
  name: string;
  type: ProductionActivityType;
  description: string;
  status: ProductionActivityStatus;
  seasonsCount: number;
}

export const PRODUCTION_ACTIVITY_TYPE_LABELS: Record<ProductionActivityType, string> = {
  AGRICULTURE: 'Agricultura',
  LIVESTOCK: 'Pecuária',
  MIXED: 'Mista',
  OTHER: 'Outra',
};

export const PRODUCTION_ACTIVITY_STATUS_LABELS: Record<ProductionActivityStatus, string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
};

export const productionActivitySummaryMock: ProductionActivitySummary = {
  total: 9,
  active: 7,
  inactive: 2,
  mostUsedName: 'Soja',
};

export const productionActivitiesMock: readonly ProductionActivityListItem[] = [
  {
    id: 1,
    name: 'Soja',
    type: 'AGRICULTURE',
    description: 'Cultura anual de grãos',
    status: 'ACTIVE',
    seasonsCount: 8,
  },
  {
    id: 2,
    name: 'Milho',
    type: 'AGRICULTURE',
    description: 'Cultura anual para grãos e silagem',
    status: 'ACTIVE',
    seasonsCount: 5,
  },
  {
    id: 3,
    name: 'Café',
    type: 'AGRICULTURE',
    description: 'Cultura perene',
    status: 'ACTIVE',
    seasonsCount: 3,
  },
  {
    id: 4,
    name: 'Leite',
    type: 'LIVESTOCK',
    description: 'Produção leiteira recorrente',
    status: 'ACTIVE',
    seasonsCount: 2,
  },
  {
    id: 5,
    name: 'Gado de corte',
    type: 'LIVESTOCK',
    description: 'Ciclo de engorda e venda',
    status: 'ACTIVE',
    seasonsCount: 2,
  },
  {
    id: 6,
    name: 'Gado de leite',
    type: 'LIVESTOCK',
    description: 'Atividade leiteira especializada',
    status: 'INACTIVE',
    seasonsCount: 1,
  },
  {
    id: 7,
    name: 'Hortaliças',
    type: 'AGRICULTURE',
    description: 'Produção diversificada de curto ciclo',
    status: 'ACTIVE',
    seasonsCount: 1,
  },
  {
    id: 8,
    name: 'Cana-de-açúcar',
    type: 'AGRICULTURE',
    description: 'Cultura semiperene',
    status: 'ACTIVE',
    seasonsCount: 4,
  },
  {
    id: 9,
    name: 'Feijão',
    type: 'AGRICULTURE',
    description: 'Cultura anual de ciclo curto',
    status: 'INACTIVE',
    seasonsCount: 1,
  },
];
