import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFarmRequest,
  Farm,
  FarmListParams,
  UpdateFarmRequest,
  UpdateFarmStatusRequest,
} from '../models/farm.models';
import { PageResponse } from '../models/page-response.model';
import { onlyDigits } from '../../shared/utils/document.utils';

@Injectable({
  providedIn: 'root',
})
export class FarmService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(params?: FarmListParams): Observable<PageResponse<Farm>> {
    return this.http.get<PageResponse<Farm>>(`${this.apiUrl}/farms`, {
      params: this.buildParams(params),
    });
  }

  getById(id: number): Observable<Farm> {
    return this.http.get<Farm>(`${this.apiUrl}/farms/${id}`);
  }

  create(payload: CreateFarmRequest): Observable<Farm> {
    return this.http.post<Farm>(this.apiUrl + '/farms', payload);
  }

  update(id: number, payload: UpdateFarmRequest): Observable<Farm> {
    return this.http.put<Farm>(this.apiUrl + '/farms/' + id, payload);
  }

  updateStatus(id: number, payload: UpdateFarmStatusRequest): Observable<Farm> {
    return this.http.patch<Farm>(this.apiUrl + '/farms/' + id + '/status', payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.apiUrl + '/farms/' + id);
  }

  private buildParams(params?: FarmListParams): HttpParams {
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

    httpParams = this.setOptionalParam(httpParams, 'search', params.search);
    httpParams = this.setOptionalParam(httpParams, 'document', onlyDigits(params.document));
    httpParams = this.setOptionalParam(httpParams, 'productionType', params.productionType);
    httpParams = this.setOptionalParam(httpParams, 'status', params.status);

    return httpParams;
  }

  private setOptionalParam(
    httpParams: HttpParams,
    key: string,
    value: string | null | undefined,
  ): HttpParams {
    const normalized = value?.trim() ?? '';
    return normalized ? httpParams.set(key, normalized) : httpParams;
  }
}
