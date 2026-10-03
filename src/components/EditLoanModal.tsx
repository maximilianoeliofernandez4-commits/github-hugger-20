import { useEffect, useState } from 'react';
import { Modal, Input, MoneyInput, Select, Textarea, Button } from './ui';
import type { Store } from '@/hooks/useStore';
import type { Loan, LoanModality, Payment, PaymentFrequency, PaymentMethod } from '@/types';
import { formatCurrency, todayISO, uid } from '@/lib/format';
import { withRunningBalances, generateSchedule, periodRateMonthly, addNextPaymentDate } from '@/lib/loan';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  loan: Loan | null;
}

interface Row {
  id: string;
  receiptNo: string;
  date: string;
  toInterest: string;
  toCapital: string;
  method: PaymentMethod;
  note: string;
}

export function EditLoanModal({ open, onClose, store, loan }: Props) {
  const [capital, setCapital] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [modality, setModality] = useState<LoanModality>('solo_interes');
  const [frequency, setFrequency] = useState<PaymentFrequency>('mensual');
  const [termLength, setTermLength] = useState('6');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open || !loan) return;
    setCapital(String(Math.round(loan.capital)));
    setRate(String(loan.interestRate));
    setStartDate(loan.startDate);
    setModality(loan.modality);
    setFrequency(loan.frequency);
    setTermLength(String(loan.termLength));
    setNote(loan.note);
    setRows(
      store.state.payments
        .filter((p) => p.loanId === loan.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({
          id: p.id,
          receiptNo: p.receiptNo,
          date: p.date,
          toInterest: String(Math.round(p.toInterest)),
          toCapital: String(Math.round(p.toCapital)),
          method: p.method,
          note: p.note,
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id]);

  if (!loan) return null;

  const cap = parseFloat(capital) || 0;
  const r = parseFloat(rate) || 0;
  const draftLoan: Loan = {
    ...loan,
    capital: cap,
    interestRate: r,
    startDate,
    modality,
    frequency,
    termLength: modality === 'solo_interes' ? loan.termLength : parseInt(termLength) || 0,
    note,
  };

  const paidCapital = rows.reduce((s, x) => s + (parseFloat(x.toCapital) || 0), 0);
  const paidInterest = rows.reduce((s, x) => s + (parseFloat(x.toInterest) || 0), 0);
  const remaining = Math.max(0, cap - paidCapital);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addRow = () => {
    const idx = rows.length;
    const last = rows[rows.length - 1];
    const date = addNextPaymentDate(startDate, idx + 1, frequency, last?.date);
    let interest = 0;
    let capPart = 0;
    if (modality === 'solo_interes') {
      interest = remaining * periodRateMonthly(r, frequency);
    } else {
      const row = generateSchedule(draftLoan)[idx];
      interest = row?.interest ?? 0;
      capPart = Math.min(row?.capital ?? 0, remaining);
    }
    setRows((rs) => [
      ...rs,
      { id: uid(), receiptNo: '', date, toInterest: String(Math.round(interest)), toCapital: String(Math.round(capPart)), method: loan.paymentMethod, note: '' },
    ]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (cap <= 0 || r <= 0) return;
    store.updateLoan(loan.id, {
      capital: draftLoan.capital,
      interestRate: draftLoan.interestRate,
      startDate: draftLoan.startDate,
      modality: draftLoan.modality,
      frequency: draftLoan.frequency,
      termLength: modality === 'solo_interes' ? loan.termLength || 1 : draftLoan.termLength,
      note: draftLoan.note.trim(),
    });
    const payments: Payment[] = rows.map((x) => {
      const toInterest = parseFloat(x.toInterest) || 0;
      const toCapital = parseFloat(x.toCapital) || 0;
      return {
        id: x.id,
        receiptNo: x.receiptNo,
        loanId: loan.id,
        date: x.date,
        amount: toInterest + toCapital,
        method: x.method,
        concept: (toCapital > 0 && toInterest > 0 ? 'mixto' : toCapital > 0 ? 'capital' : 'interes') as Payment['concept'],
        imputation: 'mixto' as const,
        toInterest,
        toCapital,
        note: x.note,
        remainingCapital: 0,
        remainingInterest: 0,
      };
    }).filter((p) => p.amount > 0);
    store.replaceLoanPayments(loan.id, withRunningBalances(draftLoan, payments));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Préstamo" size="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <MoneyInput label="Capital prestado (ARS) *" value={capital} onChange={setCapital} />
          <Input label="Tasa mensual (%) *" type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha en que lo prestaste *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Select label="Frecuencia" value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
            <option value="mensual">Mensual</option>
            <option value="semanal">Semanal</option>
            <option value="diario">Diario</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Modalidad" value={modality} onChange={(e) => setModality(e.target.value as LoanModality)}>
            <option value="cuota_fija">Cuota Fija (Capital + Interés)</option>
            <option value="solo_interes">Solo Interés</option>
            <option value="personalizado">Personalizado / Flexible</option>
          </Select>
          {modality !== 'solo_interes' && (
            <Input label="Plazo (cantidad de cuotas)" type="number" value={termLength} onChange={(e) => setTermLength(e.target.value)} />
          )}
        </div>
        <Textarea label="Notas" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />

        <div className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Pagos que ya te hizo</p>
              <p className="text-xs text-slate-500">Corregí montos o fechas, borrá o agregá pagos anteriores.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addRow}><Plus size={14} /> Agregar pago</Button>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Todavía no hay pagos registrados.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {rows.map((x, i) => (
                <div key={x.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-end gap-2 px-4 py-2">
                  <span className="pb-2 text-xs font-medium text-slate-400">{i + 1}</span>
                  <Input label={i === 0 ? 'Fecha' : ''} type="date" value={x.date} onChange={(e) => update(x.id, { date: e.target.value })} />
                  <MoneyInput label={i === 0 ? 'A interés' : ''} value={x.toInterest} onChange={(v) => update(x.id, { toInterest: v })} />
                  <MoneyInput label={i === 0 ? 'A capital' : ''} value={x.toCapital} onChange={(v) => update(x.id, { toCapital: v })} />
                  <button type="button" onClick={() => setRows((rs) => rs.filter((y) => y.id !== x.id))} className="mb-1 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Borrar pago">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <div><p className="text-xs text-slate-400">Interés cobrado</p><p className="font-bold text-emerald-600">{formatCurrency(paidInterest)}</p></div>
            <div><p className="text-xs text-slate-400">Capital devuelto</p><p className="font-bold text-slate-800">{formatCurrency(paidCapital)}</p></div>
            <div><p className="text-xs text-slate-400">Capital que debe</p><p className="font-bold text-amber-600">{formatCurrency(remaining)}</p></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={cap <= 0 || r <= 0}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}
