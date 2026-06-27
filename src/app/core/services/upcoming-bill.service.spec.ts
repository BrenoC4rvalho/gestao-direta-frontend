import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UpcomingBill } from '../models/financial.models';
import { PageResponse } from '../models/page-response.model';

import { UpcomingBillService } from './upcoming-bill.service';

const apiUrl = 'http://localhost:8080/api';

const bill: UpcomingBill = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  status: 'PENDING',
  dueDate: '2026-06-30',
  farmId: 1,
  categoryId: 1,
  categoryName: 'Insumos',
};

const response: PageResponse<UpcomingBill> = {
  content: [bill],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('UpcomingBillService', () => {
  let service: UpcomingBillService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UpcomingBillService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UpcomingBillService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should list upcoming bills with farmId and default pagination params', () => {
    service.listByFarm(1).subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne(
      apiUrl + '/financial/upcoming-bills?farmId=1&page=0&size=10&sort=dueDate&direction=ASC',
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('should not send undocumented filters to the backend', () => {
    service
      .listByFarm(1, {
        page: 2,
        size: 20,
        sort: 'dueDate',
        direction: 'ASC',
        status: 'PENDING',
      })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne(
      apiUrl + '/financial/upcoming-bills?farmId=1&page=2&size=20&sort=dueDate&direction=ASC',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('status')).toBe(false);
    request.flush(response);
  });
});
