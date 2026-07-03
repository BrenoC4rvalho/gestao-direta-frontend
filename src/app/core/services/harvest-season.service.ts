import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  CreateHarvestSeasonRequest,
  HarvestSeason,
  HarvestSeasonListParams,
  HarvestSeasonStatus,
  UpdateHarvestSeasonRequest,
} from '../models/harvest-season.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class HarvestSeasonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/harvest/seasons`;

  list(params?: HarvestSeasonListParams): Observable<PageResponse<HarvestSeason>> {
    return this.http.get<PageResponse<HarvestSeason>>(this.apiUrl, {
      params: this.buildParams(params),
    });
  }

  getById(id: number): Observable<HarvestSeason> {
    return this.http.get<HarvestSeason>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateHarvestSeasonRequest): Observable<HarvestSeason> {
    return this.http.post<HarvestSeason>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateHarvestSeasonRequest): Observable<HarvestSeason> {
    return this.http.put<HarvestSeason>(`${this.apiUrl}/${id}`, payload);
  }

  updateStatus(id: number, status: HarvestSeasonStatus): Observable<HarvestSeason> {
    return this.http.patch<HarvestSeason>(`${this.apiUrl}/${id}/status`, { status });
  }

  activate(id: number): Observable<HarvestSeason> {
    return this.http.patch<HarvestSeason>(`${this.apiUrl}/${id}/activate`, {});
  }

  inactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private buildParams(params?: HarvestSeasonListParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    httpParams = appendQueryParam(httpParams, 'farmId', params.farmId);
    httpParams = appendQueryParam(httpParams, 'includeInactive', params.includeInactive);
    httpParams = appendQueryParam(httpParams, 'page', params.page);
    httpParams = appendQueryParam(httpParams, 'size', params.size);
    httpParams = appendQueryParam(httpParams, 'sort', params.sort);
    httpParams = appendQueryParam(httpParams, 'direction', params.direction);

    return httpParams;
  }
}
