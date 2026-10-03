import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from './ui';
import type { Store } from '@/hooks/useStore';
import type { Client, Loan, LoanModality, PaymentMethod, PaymentFrequency } from '@/types';
import { todayISO, formatCurrency } from '@/lib/format';
import { effectiveMonths, fixedPeriodPayment } from '@/lib/loan';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  client: Client | null;
  fixedClient?: boolean;
}

const FREQ_PERIOD_WORD: Record<PaymentFrequency, string> = {
  mensual: 'mes',
  semanal: 'semana',
  diario: 'día',
};

const FREQ_PERIODS_WORD: Record<PaymentFrequency, string> = {
  mensual: 'meses',
  semanal: 'semanas',
  diario: 'días',
};

function roundToFive(value: number): number {
  if (value < 5) return value;
  return Math.round(value / 5) * 5;
}

export function NewLoanModal({ open, onClose, store, client, fixedClient }: Props) {
  const [clientId, setClientId] = useState(client?.id ?? '');
  const [capital, setCapital] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [interestRate, setInterestRate] = useState('');
  const [modality, setModality] = useState<LoanModality>('solo_interes');
  const [frequency, setFrequency] = useState<PaymentFrequency>('mensual');
  const [termLength, setTermLength] = useState('6');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [note, setNote] = useState('');

  const cap = parseFloat(capital) || 0;
  const rate = parseFloat(interestRate) || 0;
  const openEnded = modality === 'solo_interes';
  const term = openEnded ? periodsPerMonth(frequency) : parseInt(termLength) || 0;

  const periodWord = FREQ_PERIOD_WORD[frequency];
  const periodsWord = FREQ_PERIODS_WORD[frequency];

  const showPreview = cap > 0 && rate > 0 && term > 0;

  const effMonths = showPreview
    ? effectiveMonths({ interestRate: rate, frequency, termLength: term } as Loan)
    : 0;

  const shouldRound = modality === 'personalizado';
  const rawTotalPct = effMonths > 0 ? rate * effMonths : 0;
  const roundedTotalPct = roundToFive(rawTotalPct);
  const isRounded = Math.abs(roundedTotalPct - rawTotalPct) > 0.01;
  const adjustedRate = effMonths > 0 && shouldRound ? roundedTotalPct / effMonths : rate;

  const perPeriodCharge = showPreview
    ? openEnded
      ? cap * periodRateMonthly(rate, frequency)
      : shouldRound
      ? (cap * roundedTotalPct / 100) / term
      : fixedPeriodPayment(cap, rate, term, frequency)
    : 0;

  const totalInterestAmount = shouldRound
    ? cap * roundedTotalPct / 100
    : Math.max(0, perPeriodCharge * term - cap);

  const totalToPay = shouldRound
    ? cap + totalInterestAmount
    : perPeriodCharge * term;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || cap <= 0 || rate <= 0 || term <= 0) return;
    store.addLoan({
      clientId,
      capital: cap,
      startDate,
      interestRate: shouldRound ? adjustedRate : rate,
      modality,
      frequency,
      termLength: term,
      paymentMethod,
      note: note.trim(),
    });
    setCapital('');
    setInterestRate('');
    setNote('');
    setTermLength('6');
    setFrequency('mensual');
    onClose();
  };

  const modalityLabels: Record<LoanModality, string> = {
    cuota_fija: 'Cuota Fija (Capital + Interés)',
    solo_interes: 'Solo Interés',
    personalizado: 'Personalizado / Flexible',
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Préstamo" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!fixedClient && (
          <Select label="Cliente *" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Seleccionar cliente...</option>
            {store.state.clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Capital inicial (ARS) *" type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="1000000" />
          <Input label="Tasa de interés mensual (%) *" type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="5" hint="Siempre mensual — la app calcula el proporcional" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha de inicio *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          {openEnded ? (
            <div className="text-xs text-slate-500 self-end pb-2">Sin plazo: cobra interés cada {periodWord} hasta que devuelva el capital.</div>
          ) : <Input label={`Plazo (${periodsWord}) *`} type="number" value={termLength} onChange={(e) => setTermLength(e.target.value)} placeholder="6" hint={effMonths > 0 ? `Equivale a ${effMonths.toFixed(1)} meses` : undefined} />}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Frecuencia de pago *" value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
            <option value="mensual">Mensual</option>
            <option value="semanal">Semanal</option>
            <option value="diario">Diario</option>
          </Select>
          <Select label="Modalidad de pago *" value={modality} onChange={(e) => setModality(e.target.value as LoanModality)}>
            {(Object.entries(modalityLabels) as [LoanModality, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        <Select label="Método de pago preferido" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </Select>

        <Textarea label="Notas del préstamo" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Condiciones especiales, acuerdos, etc." />

        {showPreview && openEnded && (
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-4">
            <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Interés {periodWord}</p>
            <p className="text-2xl font-bold text-teal-900">{formatCurrency(perPeriodCharge)}</p>
            <p className="mt-2 text-xs text-teal-600">Cobra {formatCurrency(perPeriodCharge)} de interés cada {periodWord}, las veces que haga falta. Cuando devuelva el capital ({formatCurrency(cap)}) el préstamo queda liquidado.</p>
          </div>
        )}
        {showPreview && !openEnded && (
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">
                  {modality === 'cuota_fija' ? `Cuota ${periodWord}` : `Cobro ${periodWord}`}
                </p>
                <p className="text-2xl font-bold text-teal-900">{formatCurrency(perPeriodCharge)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Total a pagar</p>
                <p className="text-xl font-bold text-teal-900">{formatCurrency(totalToPay)}</p>
              </div>
            </div>

            <div className="border-t border-teal-100 pt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-teal-500">Capital</p>
                <p className="font-semibold text-teal-800">{formatCurrency(cap)}</p>
              </div>
              <div>
                <p className="text-xs text-teal-500">Interés total</p>
                <p className="font-semibold text-teal-800">
                  {shouldRound
                    ? `${roundedTotalPct.toFixed(0)}%`
                    : `${(cap > 0 ? (totalInterestAmount / cap) * 100 : 0).toFixed(1)}%`}
                  {isRounded && shouldRound && (
                    <span className="block text-xs font-normal text-teal-400">redondeado de {rawTotalPct.toFixed(1)}%</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-teal-500">Duración</p>
                <p className="font-semibold text-teal-800">{term} {periodsWord}</p>
                <p className="text-xs text-teal-400">{effMonths.toFixed(1)} meses</p>
              </div>
            </div>

            {modality === 'solo_interes' && (
              <p className="text-xs text-teal-600 border-t border-teal-100 pt-2">
                {formatCurrency(perPeriodCharge)} de interés cada {periodWord} + {formatCurrency(cap)} de capital al final
              </p>
            )}
            {modality === 'personalizado' && (
              <p className="text-xs text-teal-600 border-t border-teal-100 pt-2">
                Plan flexible: ~{formatCurrency(perPeriodCharge)} de interés cada {periodWord}, capital cuando se acuerde
              </p>
            )}
            {modality === 'cuota_fija' && (
              <p className="text-xs text-teal-600 border-t border-teal-100 pt-2">
                Cuota fija de {formatCurrency(perPeriodCharge)} cada {periodWord} durante {term} {periodsWord}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!clientId || cap <= 0}>Crear Préstamo</Button>
        </div>
      </form>
    </Modal>
  );
}
