import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FinancialCategory } from '../models/financial-category.models';
import { PageResponse } from '../models/page-response.model';

import { FinancialCategoryService } from './financial-category.service';

const apiUrl = 'http://localhost:8080/api';

const category: FinancialCategory = {
  id: 1,
  name: 'Insumos',
  type: 'EXPENSE',
  color: '#FF0000',
  icon: 'package',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  isDefault: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const response: PageResponse<FinancialCategory> = {
  content: [category],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('FinancialCategoryService', () => {
  let service: FinancialCategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FinancialCategoryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(FinancialCategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call GET /api/financial/categories with farmId', () => {
    service.listByFarm(1).subscribe((categories) => expect(categories).toEqual([category]));

    const request = http.expectOne(apiUrl + '/financial/categories?farmId=1');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('should call GET /api/financial/categories/global', () => {
    service.listGlobal().subscribe((categories) => expect(categories).toEqual([category]));

    const request = http.expectOne(apiUrl + '/financial/categories/global');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('should call GET /api/financial/categories/{id}', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('GET');
    request.flush(category);
  });

  it('should create a category', () => {
    const payload = { name: 'Adubo', type: 'EXPENSE', farmId: 1, isDefault: false };

    service.create(payload).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(category);
  });

  it('should update a category', () => {
    const payload = {
      name: 'Adubo e insumos',
      type: 'EXPENSE',
      farmId: 1,
      isDefault: false,
      status: 'ACTIVE' as const,
    };

    service.update(1, payload).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(category);
  });

  it('should activate a category', () => {
    service.activate(1).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1/activate');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    expect(request.request.body).not.toHaveProperty('name');
    expect(request.request.body).not.toHaveProperty('type');
    expect(request.request.body).not.toHaveProperty('status');
    request.flush(category);
  });

  it('should delete a category', () => {
    service.delete(1).subscribe();

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
