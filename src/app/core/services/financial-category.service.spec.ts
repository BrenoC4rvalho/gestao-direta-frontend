import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  CreateFinancialCategoryRequest,
  FinancialCategory,
  UpdateFinancialCategoryRequest,
} from '../models/financial-category.models';
import { PageResponse } from '../models/page-response.model';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';

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
        provideHttpClient(withInterceptors([credentialsInterceptor])),
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

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/categories');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.has('includeInactive')).toBe(false);
    request.flush(response);
  });

  it('should send supported filters when listing farm categories', () => {
    service
      .listByFarm(1, {
        includeInactive: true,
        search: ' Insumos ',
        type: 'EXPENSE',
        status: 'ACTIVE',
        page: 2,
        size: 20,
        sort: 'name',
        direction: 'ASC',
      })
      .subscribe((categories) => expect(categories).toEqual([category]));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/categories');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.get('includeInactive')).toBe('true');
    expect(request.request.params.get('search')).toBe('Insumos');
    expect(request.request.params.get('type')).toBe('EXPENSE');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('name');
    expect(request.request.params.get('direction')).toBe('ASC');
    request.flush(response);
  });

  it('should omit empty optional filters', () => {
    service
      .listByFarm(1, { includeInactive: undefined, search: '   ', type: null, status: null })
      .subscribe((categories) => expect(categories).toEqual([category]));

    const request = http.expectOne((req) => req.url === apiUrl + '/financial/categories');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.params.has('includeInactive')).toBe(false);
    expect(request.request.params.has('search')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(response);
  });

  it('should call GET /api/financial/categories/used-in-transactions with farmId', () => {
    service.listUsedInTransactions(1).subscribe((categories) => expect(categories).toEqual([category]));

    const request = http.expectOne(
      (req) => req.url === apiUrl + '/financial/categories/used-in-transactions',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('farmId')).toBe('1');
    expect(request.request.withCredentials).toBe(true);
    request.flush([category]);
  });

  it('should call GET /api/financial/categories/{id}', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('GET');
    request.flush(category);
  });

  it('should create a category with farmId', () => {
    const payload: CreateFinancialCategoryRequest = {
      name: 'Adubo',
      type: 'EXPENSE',
      farmId: 1,
    };

    service.create(payload).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(category);
  });

  it('should update a category without farmId', () => {
    const payload: UpdateFinancialCategoryRequest = {
      name: 'Adubo e insumos',
      type: 'EXPENSE',
      status: 'ACTIVE',
    };

    service.update(1, payload).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body).not.toHaveProperty('farmId');
    request.flush(category);
  });

  it('should activate a category', () => {
    service.activate(1).subscribe((result) => expect(result).toEqual(category));

    const request = http.expectOne(apiUrl + '/financial/categories/1/activate');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush(category);
  });

  it('should delete a category', () => {
    service.delete(1).subscribe();

    const request = http.expectOne(apiUrl + '/financial/categories/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
