import type { Loan, Payment, AmortizationRow, LoanSummary, PaymentFrequency } from '@/types';
import { addPeriodsISO } from './format';

const DAYS_PER_MONTH = 30;
const WEEKS_PER_MONTH = 4;

export function periodsPerMonth(frequency: PaymentFrequency): number {
  if (frequency === 'diario') return DAYS_PER_MONTH;
  if (frequency === 'semanal') return WEEKS_PER_MONTH;
  return 1;
}

export function periodRateMonthly(monthlyRatePct: number, frequency: PaymentFrequency): number {
  const monthly = monthlyRatePct / 100;
  return monthly / periodsPerMonth(frequency);
}

export function periodInterest(capital: number, ratePctMonthly: number, frequency: PaymentFrequency): number {
  return capital * periodRateMonthly(ratePctMonthly, frequency);
}

export function monthlyInterest(capital: number, ratePct: number): number {
  return capital * (ratePct / 100);
}

export function totalPeriods(loan: Loan): number {
  return loan.termLength;
}

export function effectiveMonths(loan: Loan): number {
  return loan.termLength / periodsPerMonth(loan.frequency);
}

export function roundUpPayment(amount: number): number {
  if (amount <= 0) return 0;
  // Redondea hacia arriba a un valor "redondo": miles para cuotas grandes,
  // quinientos/miles según el tamaño de la cuota.
  const step = amount >= 20000 ? 1000 : amount >= 5000 ? 500 : 100;
  return Math.ceil(amount / step) * step;
}

export function fixedPeriodPayment(capital: number, ratePctMonthly: number, termLength: number, frequency: PaymentFrequency): number {
  // Interés simple sobre el capital original: total = capital × tasa × meses
  const r = periodRateMonthly(ratePctMonthly, frequency);
  const n = termLength;
  if (n <= 0) return 0;
  const raw = capital / n + capital * r;
  return roundUpPayment(raw);
}

export function generateSchedule(loan: Loan): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const { capital, modality, startDate, termLength } = loan;
  const r = periodRateMonthly(loan.interestRate, loan.frequency);
  const total = totalPeriods(loan);

  if (modality === 'cuota_fija') {
    const periodPayment = fixedPeriodPayment(capital, loan.interestRate, termLength, loan.frequency);
    let balance = capital;
    const interest = capital * r;
    for (let i = 1; i <= total; i++) {
      const isLast = i === total;
      if (balance <= 0) {
        rows.push({
          month: i,
          date: addPeriodsISO(startDate, i, loan.frequency),
          payment: 0,
          interest: 0,
          capital: 0,
          balance: 0,
        });
        continue;
      }
      // La última cuota absorbe el остатo para que el total siga exacto.
      const cap = isLast ? balance : Math.min(periodPayment - interest, balance);
      balance = Math.max(0, balance - cap);
      const payment = isLast ? cap + interest : periodPayment;
      rows.push({
        month: i,
        date: addPeriodsISO(startDate, i, loan.frequency),
        payment,
        interest,
        capital: cap,
        balance,
      });
    }
  } else {
    // solo_interes and personalizado: pay interest each period, capital at the end
    const interest = capital * r;
    for (let i = 1; i <= total; i++) {
      const isLast = i === total;
      rows.push({
        month: i,
        date: addPeriodsISO(startDate, i, loan.frequency),
        payment: isLast ? interest + capital : interest,
        interest,
        capital: isLast ? capital : 0,
        balance: isLast ? 0 : capital,
      });
    }
  }
  return rows;
}

export function computeSummary(loan: Loan, payments: Payment[]): LoanSummary {
  const schedule = generateSchedule(loan);
  const loanPayments = payments
    .filter((p) => p.loanId === loan.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let paidInterest = 0;
  let paidCapital = 0;

  for (const p of loanPayments) {
    paidInterest += p.toInterest;
    paidCapital += p.toCapital;
  }

  const remainingCapital = Math.max(0, loan.capital - paidCapital);
  const totalInterestExpected = schedule.reduce((s, r) => s + r.interest, 0);
  const totalExpected = loan.capital + totalInterestExpected;
  const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
  const outstandingInterest = Math.max(0, totalInterestExpected - paidInterest);
  const isSettled = remainingCapital < 1 && outstandingInterest < 1;

  return {
    schedule,
    paidInterest,
    paidCapital,
    remainingCapital,
    remainingInterest: outstandingInterest,
    totalExpected,
    totalPaid,
    progressPct: totalExpected > 0 ? Math.min(100, (totalPaid / totalExpected) * 100) : 0,
    isSettled,
    paymentCount: loanPayments.length,
  };
}

export function nextInstallment(loan: Loan, payments: Payment[]): { month: number; amount: number; interest: number; capital: number; date: string } | null {
  const schedule = generateSchedule(loan);
  const loanPayments = payments.filter((p) => p.loanId === loan.id);
  const nextIdx = loanPayments.length;
  if (nextIdx >= schedule.length) return null;
  const row = schedule[nextIdx];
  if (!row) return null;
  return { month: row.month, amount: row.payment, interest: row.interest, capital: row.capital, date: row.date };
}

export function imputePayment(
  loan: Loan,
  payments: Payment[],
  amount: number,
  imputation: 'auto' | 'interes' | 'capital' | 'mixto',
): { toInterest: number; toCapital: number; concept: 'cuota' | 'interes' | 'capital' | 'mixto' } {
  const summary = computeSummary(loan, payments);
  const { remainingCapital, remainingInterest } = summary;
  const next = nextInstallment(loan, payments);

  if (imputation === 'capital') {
    return { toInterest: 0, toCapital: Math.min(amount, remainingCapital), concept: 'capital' };
  }
  if (imputation === 'interes') {
    return { toInterest: Math.min(amount, remainingInterest), toCapital: 0, concept: 'interes' };
  }
  if (imputation === 'mixto') {
    const toInterest = Math.min(amount / 2, remainingInterest);
    const toCapital = Math.min(amount - toInterest, remainingCapital);
    return { toInterest, toCapital, concept: 'mixto' };
  }
  if (next) {
    const expectedInterest = next.interest;
    const expectedCapital = next.capital;
    if (amount >= expectedInterest + expectedCapital) {
      return { toInterest: expectedInterest, toCapital: expectedCapital, concept: 'cuota' };
    }
    if (amount >= expectedInterest) {
      const toCap = Math.min(amount - expectedInterest, remainingCapital);
      return { toInterest: expectedInterest, toCapital: toCap, concept: 'mixto' };
    }
    return { toInterest: Math.min(amount, remainingInterest), toCapital: 0, concept: 'interes' };
  }
  const toInt = Math.min(amount, remainingInterest);
  const toCap = Math.min(amount - toInt, remainingCapital);
  return { toInterest: toInt, toCapital: toCap, concept: toCap > 0 ? 'mixto' : 'interes' };
}

export function recalculateSchedule(loan: Loan, payments: Payment[], extraPayment: number): AmortizationRow[] {
  const summary = computeSummary(loan, payments);
  const remainingCapital = Math.max(0, summary.remainingCapital - extraPayment);
  if (remainingCapital < 1) return [];
  const total = totalPeriods(loan);
  const remainingPeriods = total - summary.paymentCount;
  if (remainingPeriods <= 0) return [];
  const r = periodRateMonthly(loan.interestRate, loan.frequency);
  const startDate = addPeriodsISO(loan.startDate, summary.paymentCount + 1, loan.frequency);

  if (loan.modality === 'solo_interes' || loan.modality === 'personalizado') {
    const interest = remainingCapital * r;
    return Array.from({ length: remainingPeriods }, (_, i) => {
      const isLast = i === remainingPeriods - 1;
      return {
        month: i + 1,
        date: addPeriodsISO(startDate, i, loan.frequency),
        payment: isLast ? interest + remainingCapital : interest,
        interest,
        capital: isLast ? remainingCapital : 0,
        balance: isLast ? 0 : remainingCapital,
      };
    });
  }
  const interest = remainingCapital * r;
  const periodPayment = fixedPeriodPayment(remainingCapital, loan.interestRate, remainingPeriods, loan.frequency);
  let balance = remainingCapital;
  return Array.from({ length: remainingPeriods }, (_, i) => {
    const isLast = i === remainingPeriods - 1;
    const cap = isLast ? balance : Math.min(periodPayment - interest, balance);
    balance = Math.max(0, balance - cap);
    const payment = isLast ? cap + interest : periodPayment;
    return {
      month: i + 1,
      date: addPeriodsISO(startDate, i, loan.frequency),
      payment,
      interest,
      capital: cap,
      balance,
    };
  });
}

const FREQ_LABELS: Record<PaymentFrequency, string> = {
  mensual: 'mensual',
  semanal: 'semanal',
  diario: 'diario',
};

const PERIOD_LABELS: Record<PaymentFrequency, string> = {
  mensual: 'mes',
  semanal: 'semana',
  diario: 'día',
};

const PERIODS_LABELS: Record<PaymentFrequency, string> = {
  mensual: 'meses',
  semanal: 'semanas',
  diario: 'días',
};

export function frequencyLabel(loan: Loan): string {
  return FREQ_LABELS[loan.frequency];
}

export function periodLabel(loan: Loan): string {
  return PERIOD_LABELS[loan.frequency];
}

export function periodsLabel(loan: Loan): string {
  return PERIODS_LABELS[loan.frequency];
}

export function freqBadgeText(frequency: PaymentFrequency): string {
  if (frequency === 'diario') return 'Diario';
  if (frequency === 'semanal') return 'Semanal';
  return 'Mensual';
}
