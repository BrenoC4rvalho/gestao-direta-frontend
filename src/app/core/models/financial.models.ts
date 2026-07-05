export interface FinancialSummary {
  farmId: number;
  currentBalance: number;
  expectedIncome: number;
  expectedExpense: number;
  projectedBalance: number;
  payableNext30Days: number;
  overdueExpenses: number;
  receivableNext30Days: number;
  cashFlowNext30Days: number;
}

export interface OverdueBillAlert {
  transactionId: number;
  description: string;
  categoryName: string | null;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface DueBillsSummary {
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
