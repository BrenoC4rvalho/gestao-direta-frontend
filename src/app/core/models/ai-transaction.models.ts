export interface ParseTransactionTextRequest {
  farmId: number;
  text: string;
}

export interface ParsedTransactionResponse {
  farmId: number;
  type: 'INCOME' | 'EXPENSE' | string;
  amount: number;
  description: string;
  transactionDate: string | null;
  dueDate: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | string;
  paymentMethod: string | null;
  categoryName: string | null;
  harvestSeasonName: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
}
