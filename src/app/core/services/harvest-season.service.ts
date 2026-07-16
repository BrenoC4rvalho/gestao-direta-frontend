import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  CreateHarvestSeasonRequest,
  HarvestSeason,
  HarvestSeasonFilters,
  HarvestSeasonFinancialSummary,
  HarvestSeasonDetailSummary,
  HarvestSeasonListParams,
  HarvestSeasonStatus,
  HarvestSeasonSummaryListItem,
  HarvestSeasonSummaryListParams,
  UpdateHarvestSeasonRequest,
} from '../models/harvest-season.models';
import { PageResponse } from '../models/page-response.model';

export class InvalidHarvestSeasonDetailSummaryError extends Error {
  constructor() {
    super('Invalid harvest season detail summary response.');
  }
}

@Injectable({ providedIn: 'root' })
export class HarvestSeasonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/harvest/seasons`;

  list(params?: HarvestSeasonListParams): Observable<PageResponse<HarvestSeason>> {
    return this.http.get<PageResponse<HarvestSeason>>(this.apiUrl, {
      params: this.buildParams(params),
    });
  }

  listSummary(
    params: HarvestSeasonSummaryListParams,
  ): Observable<PageResponse<HarvestSeasonSummaryListItem>> {
    return this.http.get<PageResponse<HarvestSeasonSummaryListItem>>(
      `${this.apiUrl}/summary-list`,
      {
        params: this.buildListSummaryParams(params),
        withCredentials: true,
      },
    );
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

  getSummary(id: number): Observable<HarvestSeasonDetailSummary> {
    return this.http
      .get<unknown>(this.apiUrl + '/' + id + '/summary')
      .pipe(map((response) => this.parseDetailSummary(response)));
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

  private parseDetailSummary(value: unknown): HarvestSeasonDetailSummary {
    if (!this.isDetailSummary(value)) {
      throw new InvalidHarvestSeasonDetailSummaryError();
    }

    return value;
  }

  private isDetailSummary(value: unknown): value is HarvestSeasonDetailSummary {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isPlanningSummary(value['planning']) &&
      this.isRealizedSummary(value['realized']) &&
      this.isProjectionSummary(value['projection']) &&
      this.isComparisonSummary(value['comparison']) &&
      this.hasDetailMetadata(value) &&
      this.isOpenAmountsSummary(value['openAmounts']) &&
      typeof value['transactionCount'] === 'number' &&
      typeof value['incomeCount'] === 'number' &&
      typeof value['expenseCount'] === 'number'
    );
  }

  private hasDetailMetadata(value: Record<string, unknown>): boolean {
    return (
      typeof value['harvestSeasonId'] === 'number' &&
      typeof value['harvestSeasonName'] === 'string' &&
      typeof value['productionActivityId'] === 'number' &&
      typeof value['productionActivityName'] === 'string' &&
      typeof value['farmId'] === 'number' &&
      typeof value['farmName'] === 'string' &&
      (typeof value['areaHectares'] === 'number' || value['areaHectares'] === null)
    );
  }

  private isPlanningSummary(value: unknown): boolean {
    return this.hasNumericFields(value, ['plannedCost', 'plannedRevenue', 'plannedProfit']);
  }

  private isRealizedSummary(value: unknown): boolean {
    return this.hasNumericFields(value, ['realizedCost', 'realizedRevenue', 'realizedProfit']);
  }

  private isProjectionSummary(value: unknown): boolean {
    return this.hasNumericFields(value, ['projectedCost', 'projectedRevenue', 'projectedProfit']);
  }

  private isComparisonSummary(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      (typeof value['profitPerformancePercentage'] === 'number' ||
        value['profitPerformancePercentage'] === null) &&
      typeof value['profitPerformanceAmount'] === 'number' &&
      typeof value['profitPerformanceStatus'] === 'string' &&
      typeof value['costVarianceAmount'] === 'number' &&
      (typeof value['costVariancePercentage'] === 'number' ||
        value['costVariancePercentage'] === null) &&
      typeof value['costVarianceStatus'] === 'string'
    );
  }

  private isOpenAmountsSummary(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.hasNumericFields(value['pending'], ['payableAmount', 'receivableAmount']) &&
      this.hasNumericFields(value['overdue'], ['payableAmount', 'receivableAmount'])
    );
  }

  private hasNumericFields(value: unknown, fields: readonly string[]): boolean {
    return this.isRecord(value) && fields.every((field) => typeof value[field] === 'number');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

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
    result = this.appendCommaSeparatedParam(
      result,
      'productionActivityIds',
      filters.productionActivityIds,
    );
    result = appendQueryParam(result, 'startDate', filters.startDate);
    return appendQueryParam(result, 'endDate', filters.endDate);
  }

  private appendStatuses(
    params: HttpParams,
    statuses: readonly HarvestSeasonStatus[] | null | undefined,
  ): HttpParams {
    if (!statuses || statuses.length === 0) return params;
    if (statuses.length === 1) return appendQueryParam(params, 'status', statuses[0]);
    return this.appendCommaSeparatedParam(params, 'statuses', statuses);
  }

  private appendCommaSeparatedParam(
    params: HttpParams,
    key: string,
    values: readonly (string | number)[] | null | undefined,
  ): HttpParams {
    return !values || values.length === 0
      ? params
      : appendQueryParam(params, key, values.join(','));
  }

  private appendPageParams(
    params: HttpParams,
    page: HarvestSeasonListParams | HarvestSeasonSummaryListParams,
  ): HttpParams {
    let result = appendQueryParam(params, 'page', page.page);
    result = appendQueryParam(result, 'size', page.size);
    result = appendQueryParam(result, 'sort', page.sort);
    return appendQueryParam(result, 'direction', page.direction);
  }
}
