import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FinancialService } from './financial.service';

const apiUrl = 'http://localhost:8080/api';

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

  it('should call GET /api/financial/transactions with dashboard pagination', () => {
    service.getLatestTransactions(1).subscribe();

    const request = http.expectOne(
      apiUrl +
        '/financial/transactions?farmId=1&page=0&size=5&sort=transactionDate&direction=DESC',
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
