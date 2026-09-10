import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import {
  CreateHarvestSeasonRequest,
  DashboardHarvestSeason,
  HarvestSeason,
  HarvestSeasonDetailSummary,
  HarvestCategoryMovements,
  HarvestCategoryComparison,
  HarvestSeasonSummaryListItem,
  UpdateHarvestSeasonRequest,
} from '../models/harvest-season.models';
import { PageResponse } from '../models/page-response.model';

import {
  HarvestSeasonService,
  InvalidHarvestSeasonDetailSummaryError,
} from './harvest-season.service';

const apiUrl = 'http://localhost:8080/api/harvest/seasons';

const season: HarvestSeason = {
  id: 1,
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  productionActivityId: 2,
  productionActivityName: 'Soja',
  name: 'Safra Soja 2026',
  description: 'Safra de verao',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  expectedRevenue: 150000,
  expectedCost: 90000,
  areaHectares: 120.5,
  status: 'PLANNED',
  createdAt: '2026-06-21T10:00:00',
  updatedAt: '2026-06-21T10:00:00',
};

const summary: HarvestSeasonDetailSummary = {
  harvestSeasonId: 25,
  harvestSeasonName: 'Café 2026/2027',
  productionActivityId: 25,
  productionActivityName: 'Café',
  farmId: 8,
  farmName: 'Fazenda Boa Sorte',
  areaHectares: 48,
  planning: {
    plannedCost: 128000,
    plannedRevenue: 195000,
    plannedProfit: 67000,
    plannedMargin: 34.36,
  },
  realized: { realizedCost: 0, realizedRevenue: 0, realizedProfit: 0, realizedMargin: 0 },
  projection: {
    projectedCost: 29200,
    projectedRevenue: 58000,
    projectedProfit: 28800,
    projectedMargin: 49.66,
  },
  comparison: {
    profitPerformanceAmount: -38200,
    profitPerformancePercentage: -57.01,
    profitPerformanceStatus: 'BELOW_PLANNED',
    costVarianceAmount: -98800,
    costVariancePercentage: -77.19,
    costVarianceStatus: 'BELOW_PLANNED',
  },
  planningComparison: {
    state: 'READY',
    basis: 'PROJECTED',
    cost: {
      planned: 128000,
      current: 29200,
      difference: -98800,
      percentageDifference: -77.19,
      position: 'BELOW_PLANNED',
      semantic: 'BETTER',
      differenceUnit: 'AMOUNT',
    },
    revenue: {
      planned: 195000,
      current: 58000,
      difference: -137000,
      percentageDifference: -70.26,
      position: 'BELOW_PLANNED',
      semantic: 'WORSE',
      differenceUnit: 'AMOUNT',
    },
    profit: {
      planned: 67000,
      current: 28800,
      difference: -38200,
      percentageDifference: -57.01,
      position: 'BELOW_PLANNED',
      semantic: 'WORSE',
      differenceUnit: 'AMOUNT',
    },
    margin: {
      planned: 34.36,
      current: 49.66,
      difference: 15.3,
      percentageDifference: null,
      position: 'ABOVE_PLANNED',
      semantic: 'BETTER',
      differenceUnit: 'PERCENTAGE_POINTS',
    },
  },
  openAmounts: {
    payableAmount: 29200,
    receivableAmount: 58000,
    pending: { payableAmount: 29200, receivableAmount: 58000 },
    overdue: { payableAmount: 0, receivableAmount: 0 },
  },
  plannedCostPerHectare: 2666.67,
  plannedRevenuePerHectare: 4062.5,
  plannedResultPerHectare: 1395.83,
  projectedCostPerHectare: 608.33,
  projectedRevenuePerHectare: 1208.33,
  projectedProfitPerHectare: 600,
  realizedCostPerHectare: 0,
  realizedRevenuePerHectare: 0,
  realizedProfitPerHectare: 0,
  transactionCount: 3,
  incomeCount: 1,
  expenseCount: 2,
};

const dashboardHarvests: readonly DashboardHarvestSeason[] = [
  {
    id: 25,
    farmId: 8,
    name: 'Café 2026/2027',
    status: 'IN_PROGRESS',
    productionActivityId: 25,
    productionActivityName: 'Café',
    realized: { cost: 40000, revenue: 50000, profit: 10000 },
    projection: { cost: 68000, revenue: 132000, profit: 64000 },
    dueNext7Days: { count: 2, totalAmount: 12500 },
    overdue: { count: 1, totalAmount: 4800 },
  },
];

const categoryMovements: HarvestCategoryMovements = {
  expenses: {
    total: 1200,
    categories: [{ categoryId: 1, categoryName: 'Insumos', amount: 1200, percentage: 100 }],
  },
  incomes: { total: 0, categories: [] },
};

const categoryComparison: HarvestCategoryComparison = {
  expenses: { plannedTotal: 1200, realizedTotal: 1000, difference: -200, categories: [] },
  incomes: { plannedTotal: 0, realizedTotal: 0, difference: 0, categories: [] },
};

const response: PageResponse<HarvestSeason> = {
  content: [season],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

const summaryListItem: HarvestSeasonSummaryListItem = {
  ...season,
  expectedProfit: 60000,
  realizedCost: 72500,
  realizedRevenue: 150000,
  realizedProfit: 77500,
  pendingExpenses: 18000,
  overdueExpenses: 6000,
  pendingRevenue: 25000,
  transactionCount: 6,
  incomeCount: 3,
  expenseCount: 3,
};

const summaryListResponse: PageResponse<HarvestSeasonSummaryListItem> = {
  content: [summaryListItem],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('HarvestSeasonService', () => {
  let service: HarvestSeasonService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HarvestSeasonService,
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(HarvestSeasonService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should list harvest seasons with supported params', () => {
    service
      .list({
        farmId: 10,
        includeInactive: true,
        page: 2,
        size: 20,
        sort: 'startDate',
        direction: 'DESC',
      })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('10');
    expect(request.request.params.get('includeInactive')).toBe('true');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('startDate');
    expect(request.request.params.get('direction')).toBe('DESC');
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);
  });

  it('should call the dashboard endpoint with only farmId', () => {
    service
      .getDashboardHarvests(8)
      .subscribe((result) => expect(result).toEqual(dashboardHarvests));

    const request = http.expectOne((req) => req.url === `${apiUrl}/dashboard`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('8');
    expect(request.request.params.has('page')).toBe(false);
    expect(request.request.params.has('size')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('statuses')).toBe(false);
    request.flush(dashboardHarvests);
  });

  it('should call the comparison endpoint with the selected farm and two harvest seasons', () => {
    service.compareHarvestSeasons(8, 25, 26).subscribe();

    const request = http.expectOne((req) => req.url === `${apiUrl}/compare`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('8');
    expect(request.request.params.get('harvestSeasonIdA')).toBe('25');
    expect(request.request.params.get('harvestSeasonIdB')).toBe('26');
    request.flush({});
  });

  it('should get the category breakdown for a harvest season', () => {
    service
      .getCategoryBreakdown(25)
      .subscribe((result) => expect(result).toEqual(categoryMovements));

    const request = http.expectOne(`${apiUrl}/25/category-breakdown`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(categoryMovements);
  });

  it('should get the category comparison for a harvest season', () => {
    service
      .getCategoryComparison(25)
      .subscribe((result) => expect(result).toEqual(categoryComparison));

    const request = http.expectOne(`${apiUrl}/25/category-comparison`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(categoryComparison);
  });

  it('should call GET /api/harvest/seasons/summary-list with supported params', () => {
    service
      .listSummary({
        farmId: 10,
        search: ' soja ',
        statuses: ['PLANNED', 'IN_PROGRESS'],
        productionActivityIds: [2, 3],
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        page: 2,
        size: 20,
        sort: 'startDate',
        direction: 'DESC',
      })
      .subscribe((result) => expect(result).toEqual(summaryListResponse));

    const request = http.expectOne((req) => req.url === `${apiUrl}/summary-list`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('10');
    expect(request.request.params.get('search')).toBe('soja');
    expect(request.request.params.get('statuses')).toBe('PLANNED,IN_PROGRESS');
    expect(request.request.params.get('productionActivityIds')).toBe('2,3');
    expect(request.request.params.get('periodStart')).toBe('2026-01-01');
    expect(request.request.params.get('periodEnd')).toBe('2026-12-31');
    expect(request.request.params.has('startDate')).toBe(false);
    expect(request.request.params.has('endDate')).toBe(false);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('startDate');
    expect(request.request.params.get('direction')).toBe('DESC');
    expect(request.request.withCredentials).toBe(true);
    request.flush(summaryListResponse);
  });

  it('should omit empty optional params when listing harvest season summaries', () => {
    service
      .listSummary({
        farmId: 10,
        search: ' ',
        statuses: [],
        productionActivityIds: [],
        periodStart: '',
        periodEnd: undefined,
        page: 0,
        size: undefined,
        sort: '',
        direction: undefined,
      })
      .subscribe((result) => expect(result).toEqual(summaryListResponse));

    const request = http.expectOne((req) => req.url === `${apiUrl}/summary-list`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('10');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.has('search')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('statuses')).toBe(false);
    expect(request.request.params.has('productionActivityIds')).toBe(false);
    expect(request.request.params.has('periodStart')).toBe(false);
    expect(request.request.params.has('periodEnd')).toBe(false);
    expect(request.request.params.has('startDate')).toBe(false);
    expect(request.request.params.has('endDate')).toBe(false);
    expect(request.request.params.has('size')).toBe(false);
    expect(request.request.params.has('sort')).toBe(false);
    expect(request.request.params.has('direction')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush(summaryListResponse);
  });

  it('should send only periodStart when only the start of the period is selected', () => {
    service.listSummary({ farmId: 10, periodStart: '2026-01-01', page: 0 }).subscribe();

    const request = http.expectOne((req) => req.url === `${apiUrl}/summary-list`);
    expect(request.request.params.get('periodStart')).toBe('2026-01-01');
    expect(request.request.params.has('periodEnd')).toBe(false);
    expect(request.request.params.has('startDate')).toBe(false);
    expect(request.request.params.has('endDate')).toBe(false);
    request.flush(summaryListResponse);
  });

  it('should send only periodEnd when only the end of the period is selected', () => {
    service.listSummary({ farmId: 10, periodEnd: '2026-12-31', page: 0 }).subscribe();

    const request = http.expectOne((req) => req.url === `${apiUrl}/summary-list`);
    expect(request.request.params.has('periodStart')).toBe(false);
    expect(request.request.params.get('periodEnd')).toBe('2026-12-31');
    expect(request.request.params.has('startDate')).toBe(false);
    expect(request.request.params.has('endDate')).toBe(false);
    request.flush(summaryListResponse);
  });

  it('should send a single summary-list status using statuses', () => {
    service
      .listSummary({
        farmId: 10,
        statuses: ['INACTIVE'],
        page: 0,
      })
      .subscribe((result) => expect(result).toEqual(summaryListResponse));

    const request = http.expectOne((req) => req.url === `${apiUrl}/summary-list`);
    expect(request.request.params.get('statuses')).toBe('INACTIVE');
    expect(request.request.params.has('status')).toBe(false);
    request.flush(summaryListResponse);
  });

  it('should omit empty params when listing harvest seasons', () => {
    service
      .list({
        farmId: null,
        includeInactive: null,
        page: 0,
        size: undefined,
        sort: ' ',
        direction: undefined,
      })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.has('farmId')).toBe(false);
    expect(request.request.params.has('includeInactive')).toBe(false);
    expect(request.request.params.has('size')).toBe(false);
    expect(request.request.params.has('sort')).toBe(false);
    expect(request.request.params.has('direction')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);
  });

  it('should call GET /api/harvest/seasons/{id}', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(season));

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(season);
  });

  it('should call GET /api/harvest/seasons/{id}/summary', () => {
    service.getSummary(1).subscribe((result) => expect(result).toEqual(summary));

    const request = http.expectOne(`${apiUrl}/1/summary`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush(summary);
  });

  it('should reject an incomplete detail summary response', () => {
    service.getSummary(1).subscribe({
      next: () => {
        throw new Error('Expected the invalid summary to be rejected.');
      },
      error: (error: unknown) =>
        expect(error).toBeInstanceOf(InvalidHarvestSeasonDetailSummaryError),
    });

    http.expectOne(apiUrl + '/1/summary').flush({ planning: {} });
  });

  it('should reject a detail summary without the calculated margin and open total fields', () => {
    service.getSummary(1).subscribe({
      next: () => {
        throw new Error('Expected the invalid summary to be rejected.');
      },
      error: (error: unknown) =>
        expect(error).toBeInstanceOf(InvalidHarvestSeasonDetailSummaryError),
    });

    const invalidSummary = structuredClone(summary) as unknown as Record<string, unknown>;
    delete (invalidSummary['planning'] as Record<string, unknown>)['plannedMargin'];
    delete invalidSummary['plannedCostPerHectare'];
    delete (invalidSummary['openAmounts'] as Record<string, unknown>)['payableAmount'];

    http.expectOne(apiUrl + '/1/summary').flush(invalidSummary);
  });

  it('should reject a detail summary without planning comparison', () => {
    service.getSummary(1).subscribe({
      next: () => {
        throw new Error('Expected the invalid summary to be rejected.');
      },
      error: (error: unknown) =>
        expect(error).toBeInstanceOf(InvalidHarvestSeasonDetailSummaryError),
    });

    const invalidSummary = structuredClone(summary) as unknown as Record<string, unknown>;
    delete invalidSummary['planningComparison'];

    http.expectOne(apiUrl + '/1/summary').flush(invalidSummary);
  });

  it('should call the budget item endpoints scoped by harvest season', () => {
    const payload = {
      categoryId: 3,
      type: 'EXPENSE' as const,
      description: 'Adubação de cobertura',
      plannedAmount: 12000,
    };

    service.getBudgetItems(1).subscribe();
    const listRequest = http.expectOne(`${apiUrl}/1/budget-items`);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush({});

    service.createBudgetItem(1, payload).subscribe();
    const createRequest = http.expectOne(`${apiUrl}/1/budget-items`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(payload);
    createRequest.flush({});

    service.updateBudgetItem(1, 9, payload).subscribe();
    const updateRequest = http.expectOne(`${apiUrl}/1/budget-items/9`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(payload);
    updateRequest.flush({});

    service.deleteBudgetItem(1, 9).subscribe();
    const deleteRequest = http.expectOne(`${apiUrl}/1/budget-items/9`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
  });

  it('should create a harvest season', () => {
    const payload: CreateHarvestSeasonRequest = {
      farmId: 10,
      productionActivityId: 2,
      name: 'Safra Soja 2026',
      description: 'Safra de verao',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      areaHectares: 120.5,
    };

    service.create(payload).subscribe((result) => expect(result).toEqual(season));

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.withCredentials).toBe(true);
    request.flush(season);
  });

  it('should update a harvest season', () => {
    const payload: UpdateHarvestSeasonRequest = {
      productionActivityId: 2,
      name: 'Safra Soja Atualizada',
      description: 'Safra atualizada',
      startDate: '2026-01-01',
      endDate: '2026-07-15',
      areaHectares: 120.5,
    };

    service.update(1, payload).subscribe((result) => expect(result).toEqual(season));

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.withCredentials).toBe(true);
    request.flush(season);
  });

  it('should update a harvest season status', () => {
    service.updateStatus(1, 'IN_PROGRESS').subscribe((result) => expect(result).toEqual(season));

    const request = http.expectOne(`${apiUrl}/1/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'IN_PROGRESS' });
    expect(request.request.withCredentials).toBe(true);
    request.flush(season);
  });

  it('should activate a harvest season', () => {
    service.activate(1).subscribe((result) => expect(result).toEqual(season));

    const request = http.expectOne(`${apiUrl}/1/activate`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    expect(request.request.withCredentials).toBe(true);
    request.flush(season);
  });

  it('should inactivate a harvest season', () => {
    service.inactivate(1).subscribe();

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);
    request.flush(null);
  });
});
