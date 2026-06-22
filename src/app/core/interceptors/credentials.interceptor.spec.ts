import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  it('should add withCredentials to requests', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const http = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    http.get('/auth/session').subscribe();

    const request = httpTesting.expectOne('/auth/session');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});

    httpTesting.verify();
  });
});
