import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SystemStatus } from '../models/system-status.models';

import { SystemStatusService } from './system-status.service';

const apiUrl = 'http://localhost:8080/api';

const healthyStatus: SystemStatus = {
  status: 'UP',
  database: 'UP',
};

describe('SystemStatusService', () => {
  let service: SystemStatusService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SystemStatusService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SystemStatusService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call GET /api/system/status', () => {
    service.getStatus().subscribe((response) => {
      expect(response).toEqual(healthyStatus);
    });

    const request = http.expectOne(apiUrl + '/system/status');
    expect(request.request.method).toBe('GET');
    request.flush(healthyStatus);
  });

  it('should report healthy only when API and database are UP', () => {
    expect(service.isHealthy({ status: 'UP', database: 'UP' })).toBe(true);
  });

  it('should report DEGRADED API as unhealthy', () => {
    expect(service.isHealthy({ status: 'DEGRADED', database: 'UP' })).toBe(false);
  });

  it('should report DOWN API as unhealthy', () => {
    expect(service.isHealthy({ status: 'DOWN', database: 'UP' })).toBe(false);
  });

  it('should report DOWN database as unhealthy', () => {
    expect(service.isHealthy({ status: 'UP', database: 'DOWN' })).toBe(false);
  });
});
