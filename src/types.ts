export type PaymentMethod = 'efectivo' | 'transferencia';

export type PaymentFrequency = 'mensual' | 'semanal' | 'diario';

export type LoanModality = 'cuota_fija' | 'solo_interes' | 'personalizado';

export type PaymentConcept = 'cuota' | 'interes' | 'capital' | 'mixto';

export type PaymentImputation = 'auto' | 'interes' | 'capital' | 'mixto';

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  concept: PaymentConcept;
  imputation: PaymentImputation;
  toInterest: number;
  toCapital: number;
  note: string;
  receiptNo: string;
  remainingCapital: number;
  remainingInterest: number;
}

export interface Loan {
  id: string;
  clientId: string;
  capital: number;
  startDate: string;
  interestRate: number;
  modality: LoanModality;
  frequency: PaymentFrequency;
  termLength: number;
  paymentMethod: PaymentMethod;
  status: 'activa' | 'liquidada' | 'cancelada';
  createdAt: string;
  note: string;
}

export interface AppState {
  clients: Client[];
  loans: Loan[];
  payments: Payment[];
  receiptCounter: number;
}

export interface AmortizationRow {
  month: number;
  date: string;
  payment: number;
  interest: number;
  capital: number;
  balance: number;
}

export interface LoanSummary {
  schedule: AmortizationRow[];
  paidInterest: number;
  paidCapital: number;
  remainingCapital: number;
  remainingInterest: number;
  totalExpected: number;
  totalPaid: number;
  progressPct: number;
  isSettled: boolean;
  paymentCount: number;
}
