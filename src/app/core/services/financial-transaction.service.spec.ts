import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  CreateFinancialTransactionRequest,
  FinancialTransaction,
  UpdateFinancialTransactionRequest,
} from '../models/financial-transaction.models';
import { PageResponse } from '../models/page-response.model';

import { FinancialTransactionService } from './financial-transaction.service';

const apiUrl = 'http://localhost:8080/api';

const transaction: FinancialTransaction = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  type: 'EXPENSE',
  status: 'PENDING',
  paymentMethod: 'PIX',
  transactionDate: '2026-06-21',
  dueDate: '2026-06-30',
  paidAt: null,
  notes: 'Compra para safra',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  categoryId: 1,
  categoryName: 'Insumos',
  createdByUserId: 2,
  createdByUserName: 'User',
  updatedByUserId: null,
  updatedByUserName: null,
  recordStatus: 'ACTIVE',
  createdAt: '2026-06-21T10:00:00',
  updatedAt: '2026-06-21T10:00:00',
};

const response: PageResponse<FinancialTransaction> = {
  content: [transaction],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('FinancialTransactionService', () => {
  let service: FinancialTransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FinancialTransactionService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(FinancialTransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should list transactions with supported filter params', () => {
    service
      .listByFarm({
        farmId: 1,
        page: 2,
        size: 10,
        sort: 'transactionDate',
        direction: 'DESC',
        transactionDateStart: '2026-06-01',
        transactionDateEnd: '2026-06-30',
        paidAtStart: '2026-06-10',
        paidAtEnd: '2026-06-20',
        type: 'EXPENSE',
        categoryId: 1,
        paymentStatus: 'PENDING',
        paymentMethod: 'PIX',
        recordStatus: 'ACTIVE',
        description: 'sementes',
        createdByUserId: 2,
        minAmount: 99.99,
        maxAmount: 1000.5,
      })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/transactions');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('sort')).toBe('transactionDate');
    expect(request.request.params.get('direction')).toBe('DESC');
    expect(request.request.params.get('transactionDateStart')).toBe('2026-06-01');
    expect(request.request.params.get('transactionDateEnd')).toBe('2026-06-30');
    expect(request.request.params.get('paidAtStart')).toBe('2026-06-10');
    expect(request.request.params.get('paidAtEnd')).toBe('2026-06-20');
    expect(request.request.params.get('type')).toBe('EXPENSE');
    expect(request.request.params.get('categoryId')).toBe('1');
    expect(request.request.params.get('paymentStatus')).toBe('PENDING');
    expect(request.request.params.get('paymentMethod')).toBe('PIX');
    expect(request.request.params.get('recordStatus')).toBe('ACTIVE');
    expect(request.request.params.get('description')).toBe('sementes');
    expect(request.request.params.get('createdByUserId')).toBe('2');
    expect(request.request.params.get('minAmount')).toBe('99.99');
    expect(request.request.params.get('maxAmount')).toBe('1000.5');
    request.flush(response);
  });

  it('should not send empty filter values', () => {
    service
      .listByFarm({
        farmId: 1,
        transactionDateStart: '',
        transactionDateEnd: '   ',
        paidAtStart: null,
        paidAtEnd: undefined,
        type: null,
        categoryId: null,
        paymentStatus: undefined,
        paymentMethod: null,
        recordStatus: '',
        description: '   ',
        createdByUserId: undefined,
        minAmount: null,
        maxAmount: undefined,
      })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/transactions');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.has('transactionDateStart')).toBe(false);
    expect(request.request.params.has('transactionDateEnd')).toBe(false);
    expect(request.request.params.has('paidAtStart')).toBe(false);
    expect(request.request.params.has('paidAtEnd')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('categoryId')).toBe(false);
    expect(request.request.params.has('paymentStatus')).toBe(false);
    expect(request.request.params.has('paymentMethod')).toBe(false);
    expect(request.request.params.has('recordStatus')).toBe(false);
    expect(request.request.params.has('description')).toBe(false);
    expect(request.request.params.has('createdByUserId')).toBe(false);
    expect(request.request.params.has('minAmount')).toBe(false);
    expect(request.request.params.has('maxAmount')).toBe(false);
    request.flush(response);
  });

  it('should get transaction by id', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(transaction));

    const request = http.expectOne(apiUrl + '/financial/transactions/1');
    expect(request.request.method).toBe('GET');
    request.flush(transaction);
  });

  it('should create a transaction without audit fields', () => {
    const payload: CreateFinancialTransactionRequest = {
      description: 'Compra de sementes',
      amount: 2500,
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      transactionDate: '2026-06-21',
      dueDate: '2026-06-30',
      paidAt: null,
      notes: 'Compra para safra',
      farmId: 1,
      categoryId: 1,
    };

    service.create(payload).subscribe((result) => expect(result).toEqual(transaction));

    const request = http.expectOne(apiUrl + '/financial/transactions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.createdByUserId).toBeUndefined();
    expect(request.request.body.updatedByUserId).toBeUndefined();
    request.flush(transaction);
  });

  it('should update a transaction without farmId or audit fields', () => {
    const payload: UpdateFinancialTransactionRequest = {
      description: 'Compra atualizada',
      amount: 2600,
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      transactionDate: '2026-06-21',
      dueDate: '2026-06-30',
      paidAt: null,
      notes: 'Valor corrigido',
      categoryId: 1,
    };

    service.update(1, payload).subscribe((result) => expect(result).toEqual(transaction));

    const request = http.expectOne(apiUrl + '/financial/transactions/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.farmId).toBeUndefined();
    expect(request.request.body.createdByUserId).toBeUndefined();
    expect(request.request.body.updatedByUserId).toBeUndefined();
    request.flush(transaction);
  });

  it('should delete a transaction', () => {
    service.delete(1).subscribe();

    const request = http.expectOne(apiUrl + '/financial/transactions/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('should mark a transaction as paid', () => {
    const payload = { paidAt: '2026-06-21', paymentMethod: 'PIX' };

    service.markAsPaid(1, payload).subscribe((result) => {
      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBe('2026-06-21');
    });

    const request = http.expectOne(apiUrl + '/financial/transactions/1/pay');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({ ...transaction, status: 'PAID', paidAt: '2026-06-21' });
  });

  it('should cancel a transaction', () => {
    service.cancel(1).subscribe((result) => expect(result.status).toBe('CANCELED'));

    const request = http.expectOne(apiUrl + '/financial/transactions/1/cancel');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush({ ...transaction, status: 'CANCELED' });
  });
});
