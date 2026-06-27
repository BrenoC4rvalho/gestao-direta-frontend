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
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  type?: TransactionType | null;
  status?: PaymentStatus | null;
  categoryId?: number | null;
}

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
}

export interface MarkFinancialTransactionAsPaidRequest {
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
}

export type FinancialTransactionPage = PageResponse<FinancialTransaction>;
