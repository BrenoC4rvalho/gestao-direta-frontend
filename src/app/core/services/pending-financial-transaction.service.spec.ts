import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PendingFinancialTransaction } from '../models/pending-financial-transaction.models';
import { PendingFinancialTransactionService } from './pending-financial-transaction.service';

const apiUrl = 'http://localhost:8080/api/pending-financial-transactions';
const pending: PendingFinancialTransaction = {
  id: 1,
  farmId: 10,
  farmName: 'Boa Safra',
  type: 'EXPENSE',
  amount: 250,
  transactionDate: '2026-07-20',
  description: 'Combustível',
  categoryId: 2,
  categoryName: 'Insumos',
  rawCategoryName: null,
  status: 'PENDING_REVIEW',
  confidence: 0.9,
  sourceChannel: 'TELEGRAM',
  sourceMessageContent: 'Gastei 250',
  sourceMessageReceivedAt: '2026-07-20T10:00:00',
  requestedByUserId: 3,
  requestedByUserName: 'Maria',
  reviewedAt: null,
  rejectionReason: null,
};

describe('PendingFinancialTransactionService', () => {
  let service: PendingFinancialTransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PendingFinancialTransactionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PendingFinancialTransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('lists pending transactions with pagination and filters', () => {
    service
      .list({
        farmId: 10,
        status: 'PENDING_REVIEW',
        type: 'EXPENSE',
        page: 2,
        size: 1,
        sort: 'transactionDate',
        direction: 'ASC',
      })
      .subscribe();
    const request = http.expectOne((request) => request.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('10');
    expect(request.request.params.get('status')).toBe('PENDING_REVIEW');
    expect(request.request.params.get('type')).toBe('EXPENSE');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('1');
    expect(request.request.params.get('sort')).toBe('transactionDate');
    expect(request.request.params.get('direction')).toBe('ASC');
    request.flush({ content: [pending], totalElements: 1 });
  });

  it('gets a pending transaction by id', () => {
    service.getById(1).subscribe((value) => expect(value).toEqual(pending));
    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('GET');
    request.flush(pending);
  });

  it('updates a pending transaction with the typed body', () => {
    const body = {
      type: 'EXPENSE' as const,
      amount: 300,
      transactionDate: '2026-07-21',
      categoryId: 2,
      description: 'Diesel',
    };
    service.update(1, body).subscribe();
    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush(pending);
  });

  it('approves with payment decision data', () => {
    const body = { status: 'PAID' as const, paidAt: '2026-07-20', dueDate: null };
    service.approve(1, body).subscribe();
    const request = http.expectOne(`${apiUrl}/1/approve`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ ...pending, status: 'APPROVED' });
  });

  it('rejects with a reason', () => {
    service.reject(1, 'Duplicada').subscribe();
    const request = http.expectOne(`${apiUrl}/1/reject`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Duplicada' });
    request.flush({ ...pending, status: 'REJECTED' });
  });

  it('rejects without a reason', () => {
    service.reject(1).subscribe();
    const request = http.expectOne(`${apiUrl}/1/reject`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ ...pending, status: 'REJECTED' });
  });
});
