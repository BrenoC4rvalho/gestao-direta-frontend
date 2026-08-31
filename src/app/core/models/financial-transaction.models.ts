import { PageResponse } from './page-response.model';

export type TransactionType = 'INCOME' | 'EXPENSE' | string;

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | string;

export type PaymentMethod =
  | 'PIX'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'BOLETO'
  | 'CHECK'
  | 'OTHER'
  | string;

export type FinancialRecordStatus = 'ACTIVE' | 'DELETED' | string;

export interface FinancialTransaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  transactionDate: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  farmId: number;
  farmName: string;
  categoryId: number | null;
  categoryName: string | null;
  harvestSeasonId?: number | null;
  harvestSeasonName?: string | null;
  createdByUserId: number;
  createdByUserName: string;
  updatedByUserId: number | null;
  updatedByUserName: string | null;
  recordStatus: FinancialRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransactionListParams {
  farmId: number;
  transactionDateStart?: string | null;
  transactionDateEnd?: string | null;
  paidAtStart?: string | null;
  paidAtEnd?: string | null;
  type?: TransactionType | null;
  categoryId?: number | null;
  categoryIds?: number[] | null;
  harvestSeasonId?: number | null;
  paymentStatus?: PaymentStatus | null;
  paymentStatuses?: PaymentStatus[] | null;
  paymentMethod?: PaymentMethod | null;
  paymentMethods?: PaymentMethod[] | null;
  recordStatus?: FinancialRecordStatus | null;
  description?: string | null;
  createdByUserId?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export type FinancialTransactionExportParams = Omit<
  FinancialTransactionListParams,
  'page' | 'size' | 'sort' | 'direction'
>;

export interface CreateFinancialTransactionRequest {
  description: string;
  amount: number;
  type: TransactionType;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  transactionDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  farmId: number;
  categoryId?: number | null;
  harvestSeasonId?: number | null;
}

export interface UpdateFinancialTransactionRequest {
  description: string;
  amount: number;
  type: TransactionType;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  transactionDate: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  harvestSeasonId?: number | null;
}

export type FinancialTransactionDraft = Partial<UpdateFinancialTransactionRequest>;

export interface MarkFinancialTransactionAsPaidRequest {
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
}

export type FinancialTransactionPage = PageResponse<FinancialTransaction>;
