import { PageResponse } from './page-response.model';
import { TransactionType } from './financial-transaction.models';

export type PendingFinancialTransactionStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING_ERROR';

export interface PendingFinancialTransaction {
  id: number;
  farmId: number;
  farmName: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  rawCategoryName: string | null;
  status: PendingFinancialTransactionStatus;
  confidence: number;
  sourceChannel: 'TELEGRAM';
  sourceMessageContent: string;
  sourceMessageReceivedAt: string | null;
  requestedByUserId: number;
  requestedByUserName: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface PendingFinancialTransactionListParams {
  farmId: number;
  status?: PendingFinancialTransactionStatus;
  type?: TransactionType;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export interface ApprovePendingFinancialTransactionRequest {
  status: 'PAID' | 'PENDING';
  dueDate?: string | null;
  paidAt?: string | null;
}

export interface UpdatePendingFinancialTransactionRequest {
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  categoryId: number | null;
}

export type PendingFinancialTransactionPage = PageResponse<PendingFinancialTransaction>;
