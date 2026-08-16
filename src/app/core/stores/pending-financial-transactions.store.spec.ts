import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { PendingFinancialTransaction } from '../models/pending-financial-transaction.models';
import { PendingFinancialTransactionService } from '../services/pending-financial-transaction.service';
import { FarmAccessStore } from './farm-access.store';
import { PendingFinancialTransactionsStore } from './pending-financial-transactions.store';
import { SelectedFarmStore } from './selected-farm.store';
import { SessionStore } from './session.store';
import { ToastStore } from './toast.store';

const pending: PendingFinancialTransaction = {
  id: 1,
  farmId: 10,
  farmName: 'Boa Safra',
  type: 'EXPENSE',
  amount: 250,
  transactionDate: '2026-07-20',
  description: 'Combustível',
  missingFields: ['categoryName'],
  categoryId: null,
  categoryName: null,
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

describe('PendingFinancialTransactionsStore', () => {
  const selectedFarmId = signal<number | null>(10);
  const list = vi.fn();
  const info = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    selectedFarmId.set(10);
    list.mockReset();
    info.mockReset();
    list.mockReturnValue(
      of({ content: [pending], totalElements: 1, page: 0, size: 30, totalPages: 1 }),
    );

    TestBed.configureTestingModule({
      providers: [
        PendingFinancialTransactionsStore,
        { provide: PendingFinancialTransactionService, useValue: { list } },
        { provide: SelectedFarmStore, useValue: { selectedFarmId } },
        { provide: FarmAccessStore, useValue: { canViewFinancial: () => true } },
        { provide: SessionStore, useValue: { isAdmin: () => false } },
        { provide: ToastStore, useValue: { info } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('loads pending items and uses their total as the shared badge count', () => {
    const store = TestBed.inject(PendingFinancialTransactionsStore);
    TestBed.flushEffects();
    vi.advanceTimersByTime(0);

    expect(list).toHaveBeenCalledWith({
      farmId: 10,
      status: 'PENDING_REVIEW',
      page: 0,
      sort: 'createdAt',
      direction: 'DESC',
      type: undefined,
      size: 30,
    });
    expect(store.items()).toEqual([pending]);
    expect(store.count()).toBe(1);
  });

  it('polls once per interval and notifies only when the global count increases', () => {
    const store = TestBed.inject(PendingFinancialTransactionsStore);
    TestBed.flushEffects();
    vi.advanceTimersByTime(0);
    list.mockReturnValue(
      of({ content: [pending, { ...pending, id: 2 }], totalElements: 2, page: 0, size: 30, totalPages: 1 }),
    );

    vi.advanceTimersByTime(15_000);

    expect(list).toHaveBeenCalledTimes(2);
    expect(store.count()).toBe(2);
    expect(info).toHaveBeenCalledWith('Nova movimentação pendente recebida.');
  });

  it('removes a decided item and decrements the shared badge immediately', () => {
    const store = TestBed.inject(PendingFinancialTransactionsStore);
    TestBed.flushEffects();
    vi.advanceTimersByTime(0);

    store.remove(pending.id);

    expect(store.items()).toEqual([]);
    expect(store.count()).toBe(0);
  });
});
