import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ParsedTransactionResponse,
  ParseTransactionTextRequest,
} from '../models/ai-transaction.models';

@Injectable({
  providedIn: 'root',
})
export class AiTransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  parseTransactionText(
    request: ParseTransactionTextRequest,
  ): Observable<ParsedTransactionResponse> {
    return this.http.post<ParsedTransactionResponse>(
      `${this.apiUrl}/ai/transactions/parse`,
      request,
    );
  }
}
