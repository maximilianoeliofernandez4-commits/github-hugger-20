import { useState, useMemo } from 'react';
import { Modal, Input, Select, Textarea, Button, Badge } from './ui';
import type { Store } from '@/hooks/useStore';
import type { Loan, PaymentMethod, PaymentImputation, Client, Payment } from '@/types';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { imputePayment, computeSummary, nextInstallment, freqBadgeText, periodLabel } from '@/lib/loan';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  loan: Loan | null;
  client: Client | null;
  onPaymentRegistered: (payment: Payment) => void;
}

export function PaymentModal({ open, onClose, store, loan, client, onPaymentRegistered }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [imputation, setImputation] = useState<PaymentImputation>('auto');
  const [note, setNote] = useState('');

  const summary = useMemo(() => (loan ? computeSummary(loan, store.state.payments) : null), [loan, store.state.payments]);
  const next = useMemo(() => (loan ? nextInstallment(loan, store.state.payments) : null), [loan, store.state.payments]);

  const payAmount = parseFloat(amount) || 0;

  const imputationPreview = useMemo(() => {
    if (!loan || payAmount <= 0) return null;
    return imputePayment(loan, store.state.payments, payAmount, imputation);
  }, [loan, payAmount, imputation, store.state.payments]);

  const conceptLabels = {
    cuota: 'Cuota completa',
    interes: 'Pago de interés',
    capital: 'Abono a capital',
    mixto: 'Pago mixto (interés + capital)',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan || payAmount <= 0) return;
    const imp = imputationPreview!;
    const payment = store.addPayment({
      loanId: loan.id,
      date,
      amount: payAmount,
      method,
      concept: imp.concept,
      imputation,
      toInterest: imp.toInterest,
      toCapital: imp.toCapital,
      note: note.trim(),
      remainingCapital: Math.max(0, summary!.remainingCapital - imp.toCapital),
      remainingInterest: Math.max(0, summary!.remainingInterest - imp.toInterest),
    });
    if (payment) onPaymentRegistered(payment);
    setAmount('');
    setNote('');
    setImputation('auto');
    onClose();
  };

  const setQuickAmount = (val: number) => setAmount(String(Math.round(val)));

  if (!loan || !client || !summary) return null;

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pago" size="lg">
      <div className="mb-5 rounded-xl bg-slate-50 border border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">{client.name}</p>
            <p className="text-xs text-slate-500">
              Capital: {formatCurrency(loan.capital)} · {loan.interestRate}% mensual · {freqBadgeText(loan.frequency)} · {formatDate(loan.startDate)}
            </p>
          </div>
          <Badge variant={summary.isSettled ? 'success' : 'info'}>
            {summary.isSettled ? 'Liquidada' : 'Activa'}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-white border border-slate-100 py-2">
            <p className="text-xs text-slate-400">Capital pendiente</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(summary.remainingCapital)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-100 py-2">
            <p className="text-xs text-slate-400">Interés pendiente</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(summary.remainingInterest)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-100 py-2">
            <p className="text-xs text-slate-400">Total pagado</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Monto del pago (ARS) *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />

        {next && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setQuickAmount(next.amount)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-400 hover:text-teal-600">
              {loan.frequency === 'mensual' ? 'Cuota completa' : `Cuota ${periodLabel(loan)}`}: {formatCurrency(next.amount)}
            </button>
            <button type="button" onClick={() => setQuickAmount(next.interest)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-400 hover:text-teal-600">
              Solo interés: {formatCurrency(next.interest)}
            </button>
            {next.capital > 0 && (
              <button type="button" onClick={() => setQuickAmount(next.capital)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-400 hover:text-teal-600">
                Solo capital: {formatCurrency(next.capital)}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Método de pago" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </Select>
        </div>

        <Select label="Imputación del pago" value={imputation} onChange={(e) => setImputation(e.target.value as PaymentImputation)} hint="Define cómo se aplica el dinero: a interés, capital, o automáticamente">
          <option value="auto">Automático (cuota completa o lo que alcance)</option>
          <option value="interes">Solo pago de interés (no descuenta capital)</option>
          <option value="capital">Solo abono a capital</option>
          <option value="mixto">Mixto (mitad interés, mitad capital)</option>
        </Select>

        {imputationPreview && payAmount > 0 && (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-teal-800">Comprobante: {conceptLabels[imputationPreview.concept]}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-teal-600">A interés: </span>
                <span className="font-bold text-teal-900">{formatCurrency(imputationPreview.toInterest)}</span>
              </div>
              <div>
                <span className="text-teal-600">A capital: </span>
                <span className="font-bold text-teal-900">{formatCurrency(imputationPreview.toCapital)}</span>
              </div>
              <div className="col-span-2 border-t border-teal-100 pt-2">
                <span className="text-teal-600">Capital restante después: </span>
                <span className="font-bold text-teal-900">{formatCurrency(Math.max(0, summary.remainingCapital - imputationPreview.toCapital))}</span>
              </div>
            </div>
          </div>
        )}

        <Textarea label="Nota del pago" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ej: Pago parcial, solo interés del mes" />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={payAmount <= 0}>Registrar y Generar Comprobante</Button>
        </div>
      </form>
    </Modal>
  );
}
