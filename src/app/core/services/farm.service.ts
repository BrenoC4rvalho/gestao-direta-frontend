import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Farm } from '../models/farm.models';
import { PageRequest, PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class FarmService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(params?: PageRequest): Observable<PageResponse<Farm>> {
    return this.http.get<PageResponse<Farm>>(`${this.apiUrl}/farms`, {
      params: this.buildParams(params),
    });
  }

  getById(id: number): Observable<Farm> {
    return this.http.get<Farm>(`${this.apiUrl}/farms/${id}`);
  }

  private buildParams(params?: PageRequest): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }

    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    if (params.direction) {
      httpParams = httpParams.set('direction', params.direction);
    }

    return httpParams;
  }
}
