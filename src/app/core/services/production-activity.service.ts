import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  CreateProductionActivityRequest,
  ProductionActivity,
  ProductionActivityListParams,
  ProductionActivitySummary,
  UpdateProductionActivityRequest,
} from '../models/production-activity.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class ProductionActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/harvest/production-activities`;

  list(params: ProductionActivityListParams): Observable<PageResponse<ProductionActivity>> {
    return this.http.get<PageResponse<ProductionActivity>>(this.baseUrl, {
      params: this.buildParams(params),
    });
  }

  listActive(farmId: number): Observable<ProductionActivity[]> {
    return this.list({
      farmId,
      status: 'ACTIVE',
      page: 0,
      size: 100,
      sort: 'name',
      direction: 'ASC',
    }).pipe(map((response) => response.content));
  }

  getSummary(farmId: number): Observable<ProductionActivitySummary> {
    return this.http.get<ProductionActivitySummary>(`${this.baseUrl}/summary`, {
      params: new HttpParams().set('farmId', String(farmId)),
    });
  }

  getById(id: number): Observable<ProductionActivity> {
    return this.http.get<ProductionActivity>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateProductionActivityRequest): Observable<ProductionActivity> {
    return this.http.post<ProductionActivity>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateProductionActivityRequest): Observable<ProductionActivity> {
    return this.http.put<ProductionActivity>(`${this.baseUrl}/${id}`, payload);
  }

  activate(id: number): Observable<ProductionActivity> {
    return this.http.patch<ProductionActivity>(`${this.baseUrl}/${id}/activate`, {});
  }

  inactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private buildParams(params: ProductionActivityListParams): HttpParams {
    let httpParams = new HttpParams();

    httpParams = appendQueryParam(httpParams, 'farmId', params.farmId);
    httpParams = appendQueryParam(httpParams, 'search', params.search);
    httpParams = appendQueryParam(httpParams, 'status', params.status);
    httpParams = appendQueryParam(httpParams, 'includeInactive', params.includeInactive);
    httpParams = appendQueryParam(httpParams, 'page', params.page);
    httpParams = appendQueryParam(httpParams, 'size', params.size);
    httpParams = appendQueryParam(httpParams, 'sort', params.sort);
    httpParams = appendQueryParam(httpParams, 'direction', params.direction);

    return httpParams;
  }
}
