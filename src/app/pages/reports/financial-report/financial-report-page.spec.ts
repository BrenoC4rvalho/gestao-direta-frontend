import { FINANCIAL_REPORT_TRANSACTIONS } from './financial-report.mocks';

describe('financial report mocks', () => {
  it('provides the default cash-basis totals used by the report cards', () => {
    const income = FINANCIAL_REPORT_TRANSACTIONS.filter((item) => item.type === 'INCOME').reduce((total, item) => total + item.amount, 0);
    const expense = FINANCIAL_REPORT_TRANSACTIONS.filter((item) => item.type === 'EXPENSE').reduce((total, item) => total + item.amount, 0);

    expect(income).toBe(182500);
    expect(expense).toBe(96500);
    expect(income - expense).toBe(86000);
  });

  it('includes paid, pending and overdue transactions without HTTP fixtures', () => {
    expect(new Set(FINANCIAL_REPORT_TRANSACTIONS.map((item) => item.paymentStatus))).toEqual(new Set(['PAID', 'PENDING', 'OVERDUE']));
  });
});
