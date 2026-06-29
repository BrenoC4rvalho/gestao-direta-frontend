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

  it('should create a farm', () => {
    const payload = { name: 'Fazenda Nova' };

    service.create(payload).subscribe((response) => expect(response).toEqual(farm));

    const request = http.expectOne(apiUrl + '/farms');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(farm);
  });

  it('should update a farm', () => {
    const payload = { name: 'Fazenda Atualizada' };

    service.update(1, payload).subscribe((response) => expect(response).toEqual(farm));

    const request = http.expectOne(apiUrl + '/farms/1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(farm);
  });

  it('should update farm status', () => {
    const payload = { status: 'INACTIVE' };

    service.updateStatus(1, payload).subscribe((response) => expect(response).toEqual(farm));

    const request = http.expectOne(apiUrl + '/farms/1/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush(farm);
  });

  it('should delete a farm', () => {
    service.delete(1).subscribe();

    const request = http.expectOne(apiUrl + '/farms/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it("should send list filters and normalize document", () => {
    service
      .list({
        search: " Boa ",
        document: "12.345.678/0001-90",
        productionType: "AGRICULTURE",
        status: "ACTIVE",
      })
      .subscribe();

    const request = http.expectOne((request) => request.url === apiUrl + "/farms");
    expect(request.request.params.get("search")).toBe("Boa");
    expect(request.request.params.get("document")).toBe("12345678000190");
    expect(request.request.params.get("productionType")).toBe("AGRICULTURE");
    expect(request.request.params.get("status")).toBe("ACTIVE");
    request.flush(pageResponse);
  });

  it("should omit empty list filters", () => {
    service
      .list({ page: 0, search: "   ", document: "abc", productionType: null, status: undefined })
      .subscribe();

    const request = http.expectOne((request) => request.url === apiUrl + "/farms");
    expect(request.request.params.get("page")).toBe("0");
    expect(request.request.params.has("search")).toBe(false);
    expect(request.request.params.has("document")).toBe(false);
    expect(request.request.params.has("productionType")).toBe(false);
    expect(request.request.params.has("status")).toBe(false);
    request.flush(pageResponse);
  });

  it('should send repeated productionTypes params and omit singular productionType', () => {
    service
      .list({ productionType: 'OTHER', productionTypes: ['AGRICULTURE', 'MIXED'] })
      .subscribe();

    const request = http.expectOne((request) => request.url === apiUrl + '/farms');
    expect(request.request.params.getAll('productionTypes')).toEqual(['AGRICULTURE', 'MIXED']);
    expect(request.request.params.has('productionType')).toBe(false);
    request.flush(pageResponse);
  });

  it('should omit empty productionTypes and keep singular productionType fallback', () => {
    service.list({ productionType: 'LIVESTOCK', productionTypes: [] }).subscribe();

    const request = http.expectOne((request) => request.url === apiUrl + '/farms');
    expect(request.request.params.has('productionTypes')).toBe(false);
    expect(request.request.params.get('productionType')).toBe('LIVESTOCK');
    request.flush(pageResponse);
  });

});
