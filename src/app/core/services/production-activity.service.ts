import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  CreateProductionActivityRequest,
  ProductionActivity,
  ProductionActivityListParams,
  UpdateProductionActivityRequest,
} from '../models/production-activity.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class ProductionActivityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/harvest/production-activities`;

  list(params?: ProductionActivityListParams): Observable<PageResponse<ProductionActivity>> {
    return this.http.get<PageResponse<ProductionActivity>>(this.apiUrl, {
      params: this.buildParams(params),
    });
  }

  listActive(): Observable<ProductionActivity[]> {
    return this.http.get<ProductionActivity[]>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<ProductionActivity> {
    return this.http.get<ProductionActivity>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateProductionActivityRequest): Observable<ProductionActivity> {
    return this.http.post<ProductionActivity>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateProductionActivityRequest): Observable<ProductionActivity> {
    return this.http.put<ProductionActivity>(`${this.apiUrl}/${id}`, payload);
  }

  activate(id: number): Observable<ProductionActivity> {
    return this.http.patch<ProductionActivity>(`${this.apiUrl}/${id}/activate`, {});
  }

  inactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private buildParams(params?: ProductionActivityListParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    httpParams = appendQueryParam(httpParams, 'status', params.status);
    httpParams = appendQueryParam(httpParams, 'page', params.page);
    httpParams = appendQueryParam(httpParams, 'size', params.size);
    httpParams = appendQueryParam(httpParams, 'sort', params.sort);
    httpParams = appendQueryParam(httpParams, 'direction', params.direction);

    return httpParams;
  }
}
