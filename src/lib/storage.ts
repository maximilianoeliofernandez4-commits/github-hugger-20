import type { AppState, Client, Loan, Payment } from '@/types';
import { uid, todayISO, addMonthsISO, addWeeksISO, addDaysISO } from './format';

const STORAGE_KEY = 'prestamos_app_v3';

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { clients: [], loans: [], payments: [], receiptCounter: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Backfill: add frequency + termLength on legacy loans
      for (const l of parsed.loans) {
        if (!l.frequency) l.frequency = 'mensual';
        if (l.termLength === undefined) {
          if (l.frequency === 'semanal') {
            l.termLength = Math.round((l as unknown as { termMonths: number }).termMonths * 4.33);
          } else {
            l.termLength = (l as unknown as { termMonths: number }).termMonths;
          }
        }
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  const seeded = seedData();
  saveState(seeded);
  return seeded;
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedData(): AppState {
  const c1: Client = {
    id: uid(),
    name: 'María González',
    phone: '3001234567',
    notes: 'Cliente frecuente, paga puntual.',
    createdAt: todayISO(),
  };
  const c2: Client = {
    id: uid(),
    name: 'Carlos Ramírez',
    phone: '3109876543',
    notes: 'Negociación flexible, pagos variables.',
    createdAt: todayISO(),
  };
  const c3: Client = {
    id: uid(),
    name: 'Ana Torres',
    phone: '3205551234',
    notes: 'Préstamo con cuota fija a 6 meses.',
    createdAt: todayISO(),
  };
  const c4: Client = {
    id: uid(),
    name: 'Jorge Mendoza',
    phone: '3114567890',
    notes: 'Pagos semanales, comerciante.',
    createdAt: todayISO(),
  };
  const c5: Client = {
    id: uid(),
    name: 'Luz Marina Pérez',
    phone: '3123456789',
    notes: 'Pagos diarios, préstamo corto.',
    createdAt: todayISO(),
  };

  const l1: Loan = {
    id: uid(),
    clientId: c1.id,
    capital: 2000000,
    startDate: addMonthsISO(todayISO(), -3),
    interestRate: 5,
    modality: 'solo_interes',
    frequency: 'mensual',
    termLength: 6,
    paymentMethod: 'efectivo',
    status: 'activa',
    createdAt: addMonthsISO(todayISO(), -3),
    note: 'Solo interés mensual, capital al final.',
  };
  const l2: Loan = {
    id: uid(),
    clientId: c2.id,
    capital: 1500000,
    startDate: addMonthsISO(todayISO(), -2),
    interestRate: 4,
    modality: 'personalizado',
    frequency: 'mensual',
    termLength: 5,
    paymentMethod: 'transferencia',
    status: 'activa',
    createdAt: addMonthsISO(todayISO(), -2),
    note: 'Plan personalizado, cuotas flexibles.',
  };
  const l3: Loan = {
    id: uid(),
    clientId: c3.id,
    capital: 3000000,
    startDate: addMonthsISO(todayISO(), -2),
    interestRate: 3,
    modality: 'cuota_fija',
    frequency: 'mensual',
    termLength: 6,
    paymentMethod: 'efectivo',
    status: 'activa',
    createdAt: addMonthsISO(todayISO(), -2),
    note: 'Amortización tradicional.',
  };
  const l4: Loan = {
    id: uid(),
    clientId: c4.id,
    capital: 800000,
    startDate: addWeeksISO(todayISO(), -4),
    interestRate: 6,
    modality: 'solo_interes',
    frequency: 'semanal',
    termLength: 9,
    paymentMethod: 'efectivo',
    status: 'activa',
    createdAt: addWeeksISO(todayISO(), -4),
    note: 'Pagos semanales (~2 meses), interés cada semana.',
  };
  const l5: Loan = {
    id: uid(),
    clientId: c5.id,
    capital: 500000,
    startDate: addDaysISO(todayISO(), -10),
    interestRate: 10,
    modality: 'solo_interes',
    frequency: 'diario',
    termLength: 30,
    paymentMethod: 'efectivo',
    status: 'activa',
    createdAt: addDaysISO(todayISO(), -10),
    note: 'Pagos diarios por 30 días (~1 mes), interés diario.',
  };

  const payments: Payment[] = [];

  // María: 3 months of interest payments (100k each)
  for (let i = 1; i <= 3; i++) {
    payments.push({
      id: uid(),
      loanId: l1.id,
      date: addMonthsISO(l1.startDate, i),
      amount: 100000,
      method: 'efectivo',
      concept: 'interes',
      imputation: 'interes',
      toInterest: 100000,
      toCapital: 0,
      note: `Interés mes ${i}`,
      receiptNo: `R-${String(i).padStart(5, '0')}`,
      remainingCapital: 2000000,
      remainingInterest: 300000 - i * 100000,
    });
  }

  // Carlos: 1 full payment + 1 partial (solo interés)
  payments.push({
    id: uid(),
    loanId: l2.id,
    date: addMonthsISO(l2.startDate, 1),
    amount: 60000,
    method: 'transferencia',
    concept: 'interes',
    imputation: 'interes',
    toInterest: 60000,
    toCapital: 0,
    note: 'Solo interés mes 1',
    receiptNo: 'R-00004',
    remainingCapital: 1500000,
    remainingInterest: 200000 - 60000,
  });
  payments.push({
    id: uid(),
    loanId: l2.id,
    date: addMonthsISO(l2.startDate, 2),
    amount: 35000,
    method: 'efectivo',
    concept: 'interes',
    imputation: 'interes',
    toInterest: 35000,
    toCapital: 0,
    note: 'Pago parcial - solo interés mes 2',
    receiptNo: 'R-00005',
    remainingCapital: 1500000,
    remainingInterest: 140000 - 35000,
  });

  // Ana: 2 cuota fija payments
  const anaMonthly = (3000000 * 0.03) / (1 - Math.pow(1.03, -6));
  for (let i = 1; i <= 2; i++) {
    const interest = 3000000 * 0.03 * Math.pow(1.03, -(i - 1));
    const cap = anaMonthly - interest;
    payments.push({
      id: uid(),
      loanId: l3.id,
      date: addMonthsISO(l3.startDate, i),
      amount: Math.round(anaMonthly),
      method: 'efectivo',
      concept: 'cuota',
      imputation: 'auto',
      toInterest: Math.round(interest),
      toCapital: Math.round(cap),
      note: `Cuota ${i} de 6`,
      receiptNo: `R-${String(5 + i).padStart(5, '0')}`,
      remainingCapital: Math.round(3000000 - cap * i),
      remainingInterest: 0,
    });
  }

  // Jorge: 4 weekly interest payments
  const weeklyInterest = (800000 * 0.06) / 4.33;
  for (let i = 1; i <= 4; i++) {
    payments.push({
      id: uid(),
      loanId: l4.id,
      date: addWeeksISO(l4.startDate, i),
      amount: Math.round(weeklyInterest),
      method: 'efectivo',
      concept: 'interes',
      imputation: 'interes',
      toInterest: Math.round(weeklyInterest),
      toCapital: 0,
      note: `Interés semana ${i}`,
      receiptNo: `R-${String(7 + i).padStart(5, '0')}`,
      remainingCapital: 800000,
      remainingInterest: Math.round(weeklyInterest * (9 - i)),
    });
  }

  // Luz Marina: 10 daily interest payments
  const dailyInterest = (500000 * 0.10) / 30;
  for (let i = 1; i <= 10; i++) {
    payments.push({
      id: uid(),
      loanId: l5.id,
      date: addDaysISO(l5.startDate, i),
      amount: Math.round(dailyInterest),
      method: 'efectivo',
      concept: 'interes',
      imputation: 'interes',
      toInterest: Math.round(dailyInterest),
      toCapital: 0,
      note: `Interés día ${i}`,
      receiptNo: `R-${String(11 + i).padStart(5, '0')}`,
      remainingCapital: 500000,
      remainingInterest: Math.round(dailyInterest * (30 - i)),
    });
  }

  return {
    clients: [c1, c2, c3, c4, c5],
    loans: [l1, l2, l3, l4, l5],
    payments,
    receiptCounter: 21,
  };
}
