import { PageRequest, PageResponse } from './page-response.model';

export type FinancialAgendaType = 'RECEIVABLE' | 'PAYABLE' | string;
export type FinancialAgendaStatus = 'PENDING' | 'OVERDUE' | string;
export type FinancialAgendaFilterStatus = 'ALL' | 'PENDING' | 'OVERDUE';
export type FinancialAgendaFilterType = 'ALL' | 'RECEIVABLE' | 'PAYABLE';

export interface FinancialAgendaSummaryGroup {
  count: number;
  totalAmount: number;
}

export interface FinancialAgendaSummary {
  farmId: number;
  overdueReceivable: FinancialAgendaSummaryGroup;
  overduePayable: FinancialAgendaSummaryGroup;
  pendingReceivable: FinancialAgendaSummaryGroup;
  pendingPayable: FinancialAgendaSummaryGroup;
  openReceivable: FinancialAgendaSummaryGroup;
  openPayable: FinancialAgendaSummaryGroup;
}

export interface FinancialAgendaItem {
  id: number;
  farmId: number;
  description: string;
  agendaType: FinancialAgendaType;
  transactionType: 'INCOME' | 'EXPENSE' | string;
  agendaStatus: FinancialAgendaStatus;
  paymentStatus: string;
  amount: number;
  dueDate: string;
  daysOverdue?: number | null;
  daysUntilDue?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  harvestSeasonId?: number | null;
  harvestSeasonName?: string | null;
}

export interface FinancialAgendaFilters {
  farmId: number;
  status?: FinancialAgendaFilterStatus;
  type?: FinancialAgendaFilterType;
  periodDays?: number | null;
  harvestSeasonIds?: number[];
}

export type FinancialAgendaPage = PageResponse<FinancialAgendaItem>;
export type FinancialAgendaListParams = FinancialAgendaFilters & PageRequest;
