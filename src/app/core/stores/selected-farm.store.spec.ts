import { TestBed } from '@angular/core/testing';

import { Farm } from '../models/farm.models';

import { SelectedFarmStore } from './selected-farm.store';

const farms: Farm[] = [
  {
    id: 1,
    name: 'Fazenda Boa Safra',
    document: null,
    city: 'Ribeirão Preto',
    state: 'SP',
    totalArea: 120,
    productionType: 'AGRICULTURE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sítio Santa Clara',
    document: null,
    city: null,
    state: 'MG',
    totalArea: null,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('SelectedFarmStore', () => {
  let store: SelectedFarmStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SelectedFarmStore);
  });

  it('should define farms and select the first farm', () => {
    store.setFarms(farms);

    expect(store.farms()).toEqual(farms);
    expect(store.selectedFarm()).toEqual(farms[0]);
    expect(store.selectedFarmId()).toBe(1);
    expect(store.hasFarms()).toBe(true);
    expect(store.loaded()).toBe(true);
  });

  it('should select farm by id', () => {
    store.setFarms(farms);

    store.selectFarmById(2);

    expect(store.selectedFarm()).toEqual(farms[1]);
    expect(store.selectedFarmId()).toBe(2);
  });

  it('should preserve selected farm when it is still available', () => {
    store.setFarms(farms);
    store.selectFarmById(2);

    store.setFarms([farms[1]]);

    expect(store.selectedFarm()).toEqual(farms[1]);
  });

  it('should clear state', () => {
    store.setFarms(farms);
    store.setLoading(true);
    store.setError('Erro');

    store.clear();

    expect(store.farms()).toEqual([]);
    expect(store.selectedFarm()).toBeNull();
    expect(store.selectedFarmId()).toBeNull();
    expect(store.hasFarms()).toBe(false);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.loaded()).toBe(false);
  });
});
