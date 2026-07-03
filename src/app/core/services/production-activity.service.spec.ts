import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import {
  CreateProductionActivityRequest,
  ProductionActivity,
  UpdateProductionActivityRequest,
} from '../models/production-activity.models';
import { PageResponse } from '../models/page-response.model';

import { ProductionActivityService } from './production-activity.service';

const apiUrl = 'http://localhost:8080/api/harvest/production-activities';

const activity: ProductionActivity = {
  id: 1,
  name: 'Soja',
  description: 'Cultivo de soja',
  status: 'ACTIVE',
  createdAt: '2026-06-21T10:00:00',
  updatedAt: '2026-06-21T10:00:00',
};

const response: PageResponse<ProductionActivity> = {
  content: [activity],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('ProductionActivityService', () => {
  let service: ProductionActivityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductionActivityService,
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ProductionActivityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should list production activities with supported params', () => {
    service
      .list({ status: 'ACTIVE', page: 2, size: 20, sort: 'name', direction: 'ASC' })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('name');
    expect(request.request.params.get('direction')).toBe('ASC');
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);
  });

  it('should omit empty params when listing production activities', () => {
    service
      .list({ status: null, page: 0, size: undefined, sort: ' ', direction: undefined })
      .subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne((req) => req.url === apiUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('size')).toBe(false);
    expect(request.request.params.has('sort')).toBe(false);
    expect(request.request.params.has('direction')).toBe(false);
    request.flush(response);
  });

  it('should list active production activities', () => {
    service.listActive().subscribe((result) => expect(result).toEqual([activity]));

    const request = http.expectOne(`${apiUrl}/active`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush([activity]);
  });

  it('should call GET /api/harvest/production-activities/{id}', () => {
    service.getById(1).subscribe((result) => expect(result).toEqual(activity));

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('GET');
    request.flush(activity);
  });

  it('should create a production activity', () => {
    const payload: CreateProductionActivityRequest = {
      name: 'Soja',
      description: 'Cultivo de soja',
    };

    service.create(payload).subscribe((result) => expect(result).toEqual(activity));

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    expect(request.request.withCredentials).toBe(true);
    request.flush(activity);
  });

  it('should update a production activity', () => {
    const payload: UpdateProductionActivityRequest = {
      name: 'Soja verão',
      description: 'Cultivo de soja no verão',
    };

    service.update(1, payload).subscribe((result) => expect(result).toEqual(activity));

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(activity);
  });

  it('should activate a production activity', () => {
    service.activate(1).subscribe((result) => expect(result).toEqual(activity));

    const request = http.expectOne(`${apiUrl}/1/activate`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({});
    request.flush(activity);
  });

  it('should inactivate a production activity', () => {
    service.inactivate(1).subscribe();

    const request = http.expectOne(`${apiUrl}/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
