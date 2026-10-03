import { useState, useEffect, useCallback } from 'react';
import type { AppState, Client, Loan, Payment } from '@/types';
import { loadState, saveState } from '@/lib/storage';
import { uid } from '@/lib/format';

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addClient = useCallback((data: Omit<Client, 'id' | 'createdAt'>) => {
    const client: Client = { ...data, id: uid(), createdAt: new Date().toISOString().slice(0, 10) };
    setState((s) => ({ ...s, clients: [...s.clients, client] }));
    return client;
  }, []);

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setState((s) => {
      const loanIds = s.loans.filter((l) => l.clientId === id).map((l) => l.id);
      return {
        ...s,
        clients: s.clients.filter((c) => c.id !== id),
        loans: s.loans.filter((l) => l.clientId !== id),
        payments: s.payments.filter((p) => !loanIds.includes(p.loanId)),
      };
    });
  }, []);

  const addLoan = useCallback((data: Omit<Loan, 'id' | 'createdAt' | 'status'>) => {
    const loan: Loan = { ...data, id: uid(), createdAt: new Date().toISOString().slice(0, 10), status: 'activa' };
    setState((s) => ({ ...s, loans: [...s.loans, loan] }));
    return loan;
  }, []);

  const updateLoan = useCallback((id: string, data: Partial<Loan>) => {
    setState((s) => ({
      ...s,
      loans: s.loans.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
  }, []);

  const deleteLoan = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      loans: s.loans.filter((l) => l.id !== id),
      payments: s.payments.filter((p) => p.loanId !== id),
    }));
  }, []);

  const addPayment = useCallback((data: Omit<Payment, 'id' | 'receiptNo'>) => {
    let newPayment: Payment | null = null;
    setState((s) => {
      const receiptNo = `R-${String(s.receiptCounter + 1).padStart(5, '0')}`;
      newPayment = { ...data, id: uid(), receiptNo };
      return {
        ...s,
        payments: [...s.payments, newPayment],
        receiptCounter: s.receiptCounter + 1,
      };
    });
    return newPayment;
  }, []);

  /** Reemplaza todos los pagos de un préstamo (para editar el historial). */
  const replaceLoanPayments = useCallback((loanId: string, list: Payment[]) => {
    setState((s) => {
      let counter = s.receiptCounter;
      const next: Payment[] = list.map((p) => {
        if (p.id && p.receiptNo) return p;
        counter++;
        return { ...p, id: p.id || uid(), receiptNo: `R-${String(counter).padStart(5, '0')}` };
      });
      return { ...s, payments: [...s.payments.filter((x) => x.loanId !== loanId), ...next], receiptCounter: counter };
    });
  }, []);

  const deletePayment = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      payments: s.payments.filter((p) => p.id !== id),
    }));
  }, []);

  const getLastPayment = useCallback(
    (loanId: string): Payment | null => {
      const loanPayments = state.payments
        .filter((p) => p.loanId === loanId)
        .sort((a, b) => b.date.localeCompare(a.date));
      return loanPayments[0] || null;
    },
    [state.payments],
  );

  return {
    state,
    addClient,
    updateClient,
    deleteClient,
    addLoan,
    updateLoan,
    deleteLoan,
    addPayment,
    deletePayment,
    replaceLoanPayments,
    getLastPayment,
  };
}

export type Store = ReturnType<typeof useStore>;
