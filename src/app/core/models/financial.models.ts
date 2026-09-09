export type FinancialHorizonDays = 30 | 90 | 180;

export interface FinancialSummary {
  farmId: number;
  currentBalance: number;
  totalReceivable: number;
  totalPayable: number;
  overduePayable: number;
  horizonDays: FinancialHorizonDays;
  receivableInHorizon: number;
  payableInHorizon: number;
  projectedBalance: number;
  financialCoverage: {
    coveragePercentage: number | null;
    status: 'SUFFICIENT' | 'INSUFFICIENT' | 'NO_OBLIGATIONS';
  };
}

export interface CashFlowPoint {
  month: number;
  label: string;
  income: number;
  expense: number;
  netFlow: number;
  balance: number;
}

export interface CashFlowResponse {
  farmId: number;
  year: number;
  openingBalance: number;
  closingBalance: number;
  points: readonly CashFlowPoint[];
}

export interface OverdueBillAlert {
  transactionId: number;
  description: string;
  categoryName: string | null;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export type DueBillsSummary = FinancialAmountSummary

/** A monetary total paired with the number of records that compose it. */
export interface FinancialAmountSummary {
  count: number;
  totalAmount: number;
}

export interface FinancialAlerts {
  farmId: number;
  overdueBills: readonly OverdueBillAlert[];
  dueToday: DueBillsSummary;
  dueNext7Days: DueBillsSummary;
}

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
  recordStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingBill {
  id: number;
  description: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  farmId: number;
  farmName?: string | null;
  categoryId: number | null;
  categoryName: string | null;
  paymentMethod?: PaymentMethod | null;
  transactionDate?: string | null;
  paidAt?: string | null;
  paidDate?: string | null;
}
