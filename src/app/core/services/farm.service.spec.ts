import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Farm } from '../models/farm.models';
import { PageResponse } from '../models/page-response.model';

import { FarmService } from './farm.service';

const apiUrl = 'http://localhost:8080/api';

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const pageResponse: PageResponse<Farm> = {
  content: [farm],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('FarmService', () => {
  let service: FarmService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FarmService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FarmService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call GET /api/farms', () => {
    service.list().subscribe((response) => {
      expect(response).toEqual(pageResponse);
    });

    const request = http.expectOne(apiUrl + '/farms');
    expect(request.request.method).toBe('GET');
    request.flush(pageResponse);
  });

  it('should send pagination params on list', () => {
    service.list({ page: 0, size: 100, sort: 'name', direction: 'ASC' }).subscribe();

    const request = http.expectOne(apiUrl + '/farms?page=0&size=100&sort=name&direction=ASC');
    expect(request.request.method).toBe('GET');
    request.flush(pageResponse);
  });

  it('should call GET /api/farms/{id}', () => {
    service.getById(1).subscribe((response) => {
      expect(response).toEqual(farm);
    });

    const request = http.expectOne(apiUrl + '/farms/1');
    expect(request.request.method).toBe('GET');
    request.flush(farm);
  });
});
