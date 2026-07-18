import { FinancialReportOption, FinancialReportTransaction } from './financial-report.models';

export const FINANCIAL_REPORT_HARVESTS: readonly FinancialReportOption[] = [
  { id: 1, name: 'Café 2026/2027' },
  { id: 2, name: 'Soja 2025/2026' },
  { id: 3, name: 'Milho 2025/2026' },
];

export const FINANCIAL_REPORT_CATEGORIES: readonly FinancialReportOption[] = [
  { id: 1, name: 'Insumos' },
  { id: 2, name: 'Combustível' },
  { id: 3, name: 'Mão de obra' },
  { id: 4, name: 'Manutenção' },
  { id: 5, name: 'Financeiro' },
  { id: 6, name: 'Receita de produção' },
  { id: 7, name: 'Outros' },
];

// These transactions are the single source of truth for every mock report block.
// The cash-basis default for 2026 totals R$ 182.500,00 in income and R$ 96.500,00 in expense.
export const FINANCIAL_REPORT_TRANSACTIONS: readonly FinancialReportTransaction[] = [
  { id: 1, description: 'Venda de café beneficiado', type: 'INCOME', amount: 20000, paymentStatus: 'PAID', transactionDate: '2026-01-15', dueDate: null, paidAt: '2026-01-18', referenceDate: '2026-01-18', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 2, description: 'Adubo para café', type: 'EXPENSE', amount: 10000, paymentStatus: 'PAID', transactionDate: '2026-01-10', dueDate: null, paidAt: '2026-01-12', referenceDate: '2026-01-12', categoryId: 1, categoryName: 'Insumos', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 3, description: 'Venda de soja armazenada', type: 'INCOME', amount: 10000, paymentStatus: 'PAID', transactionDate: '2026-02-08', dueDate: null, paidAt: '2026-02-10', referenceDate: '2026-02-10', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 2, harvestSeasonName: 'Soja 2025/2026' },
  { id: 4, description: 'Sementes de milho', type: 'EXPENSE', amount: 12000, paymentStatus: 'PENDING', transactionDate: '2026-01-28', dueDate: '2026-02-20', paidAt: null, referenceDate: '2026-02-20', categoryId: 1, categoryName: 'Insumos', harvestSeasonId: 3, harvestSeasonName: 'Milho 2025/2026' },
  { id: 5, description: 'Equipe de colheita', type: 'EXPENSE', amount: 14500, paymentStatus: 'PAID', transactionDate: '2026-03-11', dueDate: null, paidAt: '2026-03-15', referenceDate: '2026-03-15', categoryId: 3, categoryName: 'Mão de obra', harvestSeasonId: 2, harvestSeasonName: 'Soja 2025/2026' },
  { id: 6, description: 'Receita de venda de milho', type: 'INCOME', amount: 15000, paymentStatus: 'PAID', transactionDate: '2026-04-19', dueDate: null, paidAt: '2026-04-20', referenceDate: '2026-04-20', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 3, harvestSeasonName: 'Milho 2025/2026' },
  { id: 7, description: 'Adiantamento de contrato', type: 'INCOME', amount: 10000, paymentStatus: 'PAID', transactionDate: '2026-05-03', dueDate: null, paidAt: '2026-05-05', referenceDate: '2026-05-05', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 8, description: 'Diesel para máquinas', type: 'EXPENSE', amount: 10000, paymentStatus: 'PAID', transactionDate: '2026-05-08', dueDate: null, paidAt: '2026-05-10', referenceDate: '2026-05-10', categoryId: 2, categoryName: 'Combustível', harvestSeasonId: null, harvestSeasonName: null },
  { id: 9, description: 'Venda de café em lote', type: 'INCOME', amount: 35000, paymentStatus: 'PAID', transactionDate: '2026-06-12', dueDate: null, paidAt: '2026-06-15', referenceDate: '2026-06-15', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 10, description: 'Venda futura de café', type: 'INCOME', amount: 40000, paymentStatus: 'PENDING', transactionDate: '2026-06-20', dueDate: '2026-06-30', paidAt: null, referenceDate: '2026-06-30', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 11, description: 'Manutenção do pulverizador', type: 'EXPENSE', amount: 9000, paymentStatus: 'PAID', transactionDate: '2026-07-07', dueDate: null, paidAt: '2026-07-08', referenceDate: '2026-07-08', categoryId: 4, categoryName: 'Manutenção', harvestSeasonId: null, harvestSeasonName: null },
  { id: 12, description: 'Juros de financiamento', type: 'EXPENSE', amount: 8000, paymentStatus: 'PAID', transactionDate: '2026-08-04', dueDate: null, paidAt: '2026-08-05', referenceDate: '2026-08-05', categoryId: 5, categoryName: 'Financeiro', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 13, description: 'Venda de café especial', type: 'INCOME', amount: 30000, paymentStatus: 'PAID', transactionDate: '2026-09-16', dueDate: null, paidAt: '2026-09-18', referenceDate: '2026-09-18', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 14, description: 'Despesas administrativas', type: 'EXPENSE', amount: 20500, paymentStatus: 'PAID', transactionDate: '2026-10-09', dueDate: null, paidAt: '2026-10-10', referenceDate: '2026-10-10', categoryId: 7, categoryName: 'Outros', harvestSeasonId: null, harvestSeasonName: null },
  { id: 15, description: 'Receita contratada de café', type: 'INCOME', amount: 22500, paymentStatus: 'PENDING', transactionDate: '2027-01-05', dueDate: '2026-11-20', paidAt: null, referenceDate: '2026-11-20', categoryId: 6, categoryName: 'Receita de produção', harvestSeasonId: 1, harvestSeasonName: 'Café 2026/2027' },
  { id: 16, description: 'Conta de manutenção vencida', type: 'EXPENSE', amount: 12500, paymentStatus: 'OVERDUE', transactionDate: '2026-11-05', dueDate: '2026-11-25', paidAt: null, referenceDate: '2026-11-25', categoryId: 4, categoryName: 'Manutenção', harvestSeasonId: null, harvestSeasonName: null },
];
