import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { appendQueryParam } from '../../shared/utils/query-params.utils';
import {
  FinancialAgendaFilters,
  FinancialAgendaListParams,
  FinancialAgendaPage,
  FinancialAgendaSummary,
} from '../models/financial-agenda.models';

@Injectable({
  providedIn: 'root',
})
export class FinancialAgendaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSummary(filters: FinancialAgendaFilters): Observable<FinancialAgendaSummary> {
    return this.http.get<FinancialAgendaSummary>(`${this.apiUrl}/financial/agenda/summary`, {
      params: this.buildFilterParams(filters),
    });
  }

  getItems(params: FinancialAgendaListParams): Observable<FinancialAgendaPage> {
    let httpParams = this.buildFilterParams(params);
    httpParams = appendQueryParam(httpParams, 'page', params.page ?? 0);
    httpParams = appendQueryParam(httpParams, 'size', params.size ?? 10);

    return this.http.get<FinancialAgendaPage>(`${this.apiUrl}/financial/agenda`, {
      params: httpParams,
    });
  }

  private buildFilterParams(filters: FinancialAgendaFilters): HttpParams {
    let httpParams = new HttpParams().set('farmId', filters.farmId);

    httpParams = appendQueryParam(
      httpParams,
      'status',
      filters.status && filters.status !== 'ALL' ? filters.status : null,
    );
    httpParams = appendQueryParam(
      httpParams,
      'type',
      filters.type && filters.type !== 'ALL' ? filters.type : null,
    );
    httpParams = appendQueryParam(httpParams, 'periodDays', filters.periodDays);
    httpParams = appendQueryParam(httpParams, 'harvestSeasonIds', filters.harvestSeasonIds ?? []);

    return httpParams;
  }
}
