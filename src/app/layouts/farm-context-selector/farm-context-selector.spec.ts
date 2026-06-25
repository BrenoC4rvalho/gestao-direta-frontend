import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';

import { FarmContextSelector } from './farm-context-selector';

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
    city: 'Uberaba',
    state: 'MG',
    totalArea: 80,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('FarmContextSelector', () => {
  let store: SelectedFarmStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmContextSelector],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    store = TestBed.inject(SelectedFarmStore);
    store.clear();
  });

  afterEach(() => store.clear());

  it('should render farms and update the selected farm', () => {
    store.setFarms(farms);
    const fixture = TestBed.createComponent(FarmContextSelector);
    fixture.componentRef.setInput('selectId', 'farm-select');
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#farm-select') as HTMLSelectElement;
    expect(select.options.length).toBe(2);

    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.selectedFarm()).toEqual(farms[1]);
  });

  it('should include a selected farm that is not in the global collection', () => {
    store.selectFarm(farms[1]);
    const fixture = TestBed.createComponent(FarmContextSelector);
    fixture.componentRef.setInput('selectId', 'farm-select');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sítio Santa Clara');
  });
});
