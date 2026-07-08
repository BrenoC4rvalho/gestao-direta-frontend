import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FinancialAgendaItem, FinancialAgendaSummary } from '../models/financial-agenda.models';
import { PageResponse } from '../models/page-response.model';
import { FinancialAgendaService } from './financial-agenda.service';

const apiUrl = 'http://localhost:8080/api';

const summary: FinancialAgendaSummary = {
  farmId: 1,
  overdueReceivable: { count: 1, totalAmount: 1000 },
  overduePayable: { count: 2, totalAmount: 500 },
  pendingReceivable: { count: 3, totalAmount: 3000 },
  pendingPayable: { count: 4, totalAmount: 1500 },
  openReceivable: { count: 4, totalAmount: 4000 },
  openPayable: { count: 6, totalAmount: 2000 },
};

const item: FinancialAgendaItem = {
  id: 1,
  farmId: 1,
  description: 'Venda de soja',
  agendaType: 'RECEIVABLE',
  transactionType: 'INCOME',
  agendaStatus: 'PENDING',
  paymentStatus: 'PENDING',
  amount: 1000,
  dueDate: '2026-07-10',
  daysOverdue: null,
  daysUntilDue: 3,
  categoryId: 1,
  categoryName: 'Venda',
  harvestSeasonId: 10,
  harvestSeasonName: 'Safra Soja',
};

const page: PageResponse<FinancialAgendaItem> = {
  content: [item],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('FinancialAgendaService', () => {
  let service: FinancialAgendaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FinancialAgendaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FinancialAgendaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call getSummary endpoint with farmId', () => {
    service.getSummary({ farmId: 1 }).subscribe((result) => expect(result).toEqual(summary));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/agenda/summary');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    request.flush(summary);
  });

  it('should send summary filters and repeated harvestSeasonIds', () => {
    service
      .getSummary({
        farmId: 1,
        status: 'OVERDUE',
        type: 'PAYABLE',
        periodDays: 30,
        harvestSeasonIds: [10, 20],
      })
      .subscribe((result) => expect(result).toEqual(summary));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/agenda/summary');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.get('status')).toBe('OVERDUE');
    expect(request.request.params.get('type')).toBe('PAYABLE');
    expect(request.request.params.get('periodDays')).toBe('30');
    expect(request.request.params.getAll('harvestSeasonIds')).toEqual(['10', '20']);
    request.flush(summary);
  });

  it('should omit ALL filters and empty optional values', () => {
    service
      .getSummary({
        farmId: 1,
        status: 'ALL',
        type: 'ALL',
        periodDays: null,
        harvestSeasonIds: [],
      })
      .subscribe((result) => expect(result).toEqual(summary));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/agenda/summary');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('periodDays')).toBe(false);
    expect(request.request.params.has('harvestSeasonIds')).toBe(false);
    request.flush(summary);
  });

  it('should call getItems endpoint with farmId and pagination', () => {
    service
      .getItems({ farmId: 1, page: 2, size: 15 })
      .subscribe((result) => expect(result).toEqual(page));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/agenda');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('15');
    request.flush(page);
  });

  it('should send item filters with repeated harvestSeasonIds', () => {
    service
      .getItems({
        farmId: 1,
        status: 'PENDING',
        type: 'RECEIVABLE',
        periodDays: 7,
        harvestSeasonIds: [10, 20],
        page: 0,
        size: 10,
      })
      .subscribe((result) => expect(result).toEqual(page));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/agenda');
    expect(request.request.params.get('status')).toBe('PENDING');
    expect(request.request.params.get('type')).toBe('RECEIVABLE');
    expect(request.request.params.get('periodDays')).toBe('7');
    expect(request.request.params.getAll('harvestSeasonIds')).toEqual(['10', '20']);
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    request.flush(page);
  });
});
