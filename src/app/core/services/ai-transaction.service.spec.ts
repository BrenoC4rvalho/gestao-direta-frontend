import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ParsedTransactionResponse } from '../models/ai-transaction.models';
import { AiTransactionService } from './ai-transaction.service';

const apiUrl = 'http://localhost:8080/api';

describe('AiTransactionService', () => {
  let service: AiTransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AiTransactionService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AiTransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should parse transaction text with farmId and text', () => {
    const response: ParsedTransactionResponse = {
      farmId: 19,
      type: 'EXPENSE',
      amount: 250,
      description: 'Adubo',
      transactionDate: '2026-07-06',
      dueDate: null,
      paymentStatus: 'PAID',
      paymentMethod: 'PIX',
      categoryName: 'Insumos',
      harvestSeasonName: 'Milho',
      confidence: 0.87,
      missingFields: [],
      warnings: [],
    };

    service
      .parseTransactionText({
        farmId: 19,
        text: 'paguei 250 reais de adubo para a safra de milho ontem no pix',
      })
      .subscribe((parsed) => {
        expect(parsed).toEqual(response);
      });

    const request = http.expectOne(apiUrl + '/ai/transactions/parse');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      farmId: 19,
      text: 'paguei 250 reais de adubo para a safra de milho ontem no pix',
    });
    request.flush(response);
  });
});
