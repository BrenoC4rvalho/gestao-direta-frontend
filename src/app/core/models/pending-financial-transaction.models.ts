import { PageResponse } from './page-response.model';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from './financial-transaction.models';

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
  missingFields: string[];
  categoryId: number | null;
  categoryName: string | null;
  rawCategoryName: string | null;
  harvestSeasonId?: number | null;
  harvestSeasonName?: string | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
  status: PendingFinancialTransactionStatus;
  confidence: number;
  sourceChannel: 'TELEGRAM';
  sourceMessageId?: number;
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
  description?: string;
  amount?: number;
  type?: TransactionType;
  status: 'PAID' | 'PENDING';
  paymentMethod?: PaymentMethod | null;
  transactionDate?: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  harvestSeasonId?: number | null;
}

export interface UpdatePendingFinancialTransactionRequest {
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  categoryId: number | null;
  harvestSeasonId?: number | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}

export type PendingFinancialTransactionPage = PageResponse<PendingFinancialTransaction>;
