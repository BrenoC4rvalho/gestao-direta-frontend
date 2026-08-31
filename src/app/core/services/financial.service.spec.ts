import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CashFlowResponse } from '../models/financial.models';
import { FinancialService } from './financial.service';

const apiUrl = environment.apiUrl;

describe('FinancialService', () => {
  let service: FinancialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FinancialService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FinancialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call GET /api/financial/summary with farmId', () => {
    service.getSummary(1).subscribe();

    const request = http.expectOne(apiUrl + '/financial/summary?farmId=1');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should call GET /api/financial/alerts with farmId', () => {
    const alerts = {
      farmId: 1,
      overdueBills: [
        {
          transactionId: 101,
          description: 'Boleto fornecedor AgroSul',
          categoryName: 'Insumos',
          amount: 3200,
          dueDate: '2026-07-02',
          daysOverdue: 3,
        },
      ],
      dueToday: { count: 1, totalAmount: 850 },
      dueNext7Days: { count: 2, totalAmount: 1400 },
    };

    service.getAlerts(1).subscribe((response) => {
      expect(response).toEqual(alerts);
    });

    const request = http.expectOne(apiUrl + '/financial/alerts?farmId=1');
    expect(request.request.method).toBe('GET');
    request.flush(alerts);
  });

  it('should call GET /api/financial/cash-flow with farmId and year', () => {
    const cashFlow: CashFlowResponse = {
      farmId: 1,
      year: 2026,
      openingBalance: 1000,
      closingBalance: 1500,
      points: [],
    };

    service.getCashFlow(1, 2026).subscribe((response) => {
      expect(response).toEqual(cashFlow);
    });

    const request = http.expectOne(apiUrl + '/financial/cash-flow?farmId=1&year=2026');
    expect(request.request.method).toBe('GET');
    request.flush(cashFlow);
  });

  it('should call GET /api/financial/transactions with dashboard pagination', () => {
    service.getLatestTransactions(1).subscribe();

    const request = http.expectOne(
      apiUrl +
        '/financial/transactions?farmId=1&page=0&size=10&sort=transactionDate&direction=DESC',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should call GET /api/financial/upcoming-bills with dashboard pagination', () => {
    service.getUpcomingBills(1).subscribe();

    const request = http.expectOne(
      apiUrl + '/financial/upcoming-bills?farmId=1&page=0&size=5&sort=dueDate&direction=ASC',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});

describe('FinancialService report endpoints', () => {
  let service: FinancialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FinancialService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FinancialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds the consolidated report request with optional CSV filters', () => {
    service
      .getFinancialReport({
        farmId: 8,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        basis: 'CASH',
        harvestSeasonIds: [25, 26],
        categoryIds: [4, 7],
      })
      .subscribe();
    const request = http.expectOne((item) => item.url === `${apiUrl}/financial/reports`);
    expect(request.request.params.get('farmId')).toBe('8');
    expect(request.request.params.get('startDate')).toBe('2026-01-01');
    expect(request.request.params.get('endDate')).toBe('2026-12-31');
    expect(request.request.params.get('basis')).toBe('CASH');
    expect(request.request.params.get('harvestSeasonIds')).toBe('25,26');
    expect(request.request.params.get('categoryIds')).toBe('4,7');
    request.flush({});
  });

  it('omits empty filters and sends transaction pagination', () => {
    service
      .getFinancialReportTransactions({
        farmId: 8,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        basis: 'ACCRUAL',
        harvestSeasonIds: [],
        categoryIds: [],
        page: 0,
        size: 6,
        sort: 'referenceDate',
        direction: 'DESC',
      })
      .subscribe();
    const request = http.expectOne(
      (item) => item.url === `${apiUrl}/financial/reports/transactions`,
    );
    expect(request.request.params.has('categoryIds')).toBe(false);
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('6');
    expect(request.request.params.get('sort')).toBe('referenceDate');
    expect(request.request.params.get('direction')).toBe('DESC');
    request.flush({
      content: [],
      page: 0,
      size: 6,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
  });

  it('exports the financial report PDF with the applied report filters', () => {
    service
      .exportFinancialReportPdf({
        farmId: 8,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        basis: 'ACCRUAL',
        harvestSeasonIds: [25],
        categoryIds: [4],
        granularity: 'QUARTERLY',
      })
      .subscribe();

    const request = http.expectOne((item) => item.url === `${apiUrl}/financial/reports/export/pdf`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    expect(request.request.params.get('farmId')).toBe('8');
    expect(request.request.params.get('harvestSeasonIds')).toBe('25');
    expect(request.request.params.get('categoryIds')).toBe('4');
    expect(request.request.params.get('granularity')).toBe('QUARTERLY');
    request.flush(new Blob(['%PDF']));
  });
});
