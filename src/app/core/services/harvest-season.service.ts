import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  CreateHarvestSeasonRequest,
  HarvestSeason,
  HarvestSeasonFilters,
  HarvestSeasonFinancialSummary,
  HarvestSeasonListParams,
  HarvestSeasonStatus,
  HarvestSeasonSummary,
  HarvestSeasonSummaryListItem,
  HarvestSeasonSummaryListParams,
  UpdateHarvestSeasonRequest,
} from '../models/harvest-season.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({ providedIn: 'root' })
export class HarvestSeasonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/harvest/seasons`;

  list(params?: HarvestSeasonListParams): Observable<PageResponse<HarvestSeason>> {
    return this.http.get<PageResponse<HarvestSeason>>(this.apiUrl, { params: this.buildParams(params) });
  }

  listSummary(params: HarvestSeasonSummaryListParams): Observable<PageResponse<HarvestSeasonSummaryListItem>> {
    return this.http.get<PageResponse<HarvestSeasonSummaryListItem>>(`${this.apiUrl}/summary-list`, {
      params: this.buildListSummaryParams(params),
      withCredentials: true,
    });
  }

  getFinancialSummary(filters: HarvestSeasonFilters): Observable<HarvestSeasonFinancialSummary> {
    return this.http.get<HarvestSeasonFinancialSummary>(`${this.apiUrl}/summary`, {
      params: this.buildFinancialSummaryParams(filters),
      withCredentials: true,
    });
  }

  getById(id: number): Observable<HarvestSeason> {
    return this.http.get<HarvestSeason>(`${this.apiUrl}/${id}`);
  }

  getSummary(id: number): Observable<HarvestSeasonSummary> {
    return this.http.get<HarvestSeasonSummary>(`${this.apiUrl}/${id}/summary`);
  }

  create(payload: CreateHarvestSeasonRequest): Observable<HarvestSeason> { return this.http.post<HarvestSeason>(this.apiUrl, payload); }
  update(id: number, payload: UpdateHarvestSeasonRequest): Observable<HarvestSeason> { return this.http.put<HarvestSeason>(`${this.apiUrl}/${id}`, payload); }
  updateStatus(id: number, status: HarvestSeasonStatus): Observable<HarvestSeason> { return this.http.patch<HarvestSeason>(`${this.apiUrl}/${id}/status`, { status }); }
  activate(id: number): Observable<HarvestSeason> { return this.http.patch<HarvestSeason>(`${this.apiUrl}/${id}/activate`, {}); }
  inactivate(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${id}`); }

  private buildParams(params?: HarvestSeasonListParams): HttpParams {
    let result = new HttpParams();
    if (!params) return result;
    result = appendQueryParam(result, 'farmId', params.farmId);
    result = appendQueryParam(result, 'includeInactive', params.includeInactive);
    return this.appendPageParams(result, params);
  }

  private buildListSummaryParams(params: HarvestSeasonSummaryListParams): HttpParams {
    return this.appendPageParams(this.buildFilterParams(params), params);
  }

  private buildFinancialSummaryParams(filters: HarvestSeasonFilters): HttpParams {
    return this.buildFilterParams(filters);
  }

  private buildFilterParams(filters: HarvestSeasonFilters): HttpParams {
    let result = new HttpParams();
    result = appendQueryParam(result, 'farmId', filters.farmId);
    result = appendQueryParam(result, 'search', filters.search);
    result = this.appendStatuses(result, filters.statuses);
    result = this.appendCommaSeparatedParam(result, 'productionActivityIds', filters.productionActivityIds);
    result = appendQueryParam(result, 'startDate', filters.startDate);
    return appendQueryParam(result, 'endDate', filters.endDate);
  }

  private appendStatuses(params: HttpParams, statuses: readonly HarvestSeasonStatus[] | null | undefined): HttpParams {
    if (!statuses || statuses.length === 0) return params;
    if (statuses.length === 1) return appendQueryParam(params, 'status', statuses[0]);
    return this.appendCommaSeparatedParam(params, 'statuses', statuses);
  }

  private appendCommaSeparatedParam(params: HttpParams, key: string, values: readonly (string | number)[] | null | undefined): HttpParams {
    return !values || values.length === 0 ? params : appendQueryParam(params, key, values.join(','));
  }

  private appendPageParams(params: HttpParams, page: HarvestSeasonListParams | HarvestSeasonSummaryListParams): HttpParams {
    let result = appendQueryParam(params, 'page', page.page);
    result = appendQueryParam(result, 'size', page.size);
    result = appendQueryParam(result, 'sort', page.sort);
    return appendQueryParam(result, 'direction', page.direction);
  }
}
