import { useMemo, useState } from 'react';
import type { Store } from '@/hooks/useStore';
import { Card, Badge, Button, ProgressBar, EmptyState } from './ui';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { computeSummary, nextInstallment, generateSchedule, freqBadgeText, periodLabel, periodsLabel, effectiveMonths } from '@/lib/loan';
import type { Loan, Payment, Client } from '@/types';
import { ArrowLeft, Phone, Plus, Wallet, Receipt, Trash2, FileText, Calendar, TrendingUp } from 'lucide-react';

interface Props {
  store: Store;
  client: Client;
  onBack: () => void;
  onNewLoan: (client: Client) => void;
  onRegisterPayment: (loan: Loan) => void;
  onViewReceipt: (payment: Payment) => void;
}

export function ClientDetail({ store, client, onBack, onNewLoan, onRegisterPayment, onViewReceipt }: Props) {
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);

  const loans = useMemo(
    () => store.state.loans.filter((l) => l.clientId === client.id),
    [store.state.loans, client.id],
  );

  const loanPayments = (loanId: string) =>
    store.state.payments
      .filter((p) => p.loanId === loanId)
      .sort((a, b) => b.date.localeCompare(a.date));

  const modalityLabels = {
    cuota_fija: 'Cuota Fija',
    solo_interes: 'Solo Interés',
    personalizado: 'Personalizado',
  };

  const freqBadge = (loan: Loan) => freqBadgeText(loan.frequency);

  const handleWhatsApp = () => {
    const phone = client.phone.replace(/\D/g, '');
    const waNumber = phone.length === 10 ? '57' + phone : phone;
    window.open(`https://wa.me/${waNumber}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-600">
          <ArrowLeft size={16} /> Volver al Dashboard
        </button>

        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold text-xl">
                {client.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
                {client.phone && (
                  <button onClick={handleWhatsApp} className="mt-1 inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline">
                    <Phone size={14} /> {client.phone}
                  </button>
                )}
                {client.notes && <p className="mt-1 text-sm text-slate-500">{client.notes}</p>}
              </div>
            </div>
            <Button onClick={() => onNewLoan(client)}>
              <Plus size={18} /> Nuevo Préstamo
            </Button>
          </div>
        </Card>
      </div>

      {/* Loans */}
      {loans.length === 0 ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title="Sin préstamos"
          description="Este cliente no tiene préstamos registrados. Crea uno para empezar a llevar control."
          action={<Button onClick={() => onNewLoan(client)}><Plus size={18} /> Crear Préstamo</Button>}
        />
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const summary = computeSummary(loan, store.state.payments);
            const next = nextInstallment(loan, store.state.payments);
            const payments = loanPayments(loan.id);
            const isExpanded = expandedLoan === loan.id;
            const showSched = showSchedule === loan.id;

            return (
              <Card key={loan.id} className="overflow-hidden">
                {/* Loan Header */}
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{formatCurrency(loan.capital)}</h3>
                        <Badge variant="info">{modalityLabels[loan.modality]}</Badge>
                        <Badge variant="neutral">{freqBadge(loan)}</Badge>
                        {summary.isSettled && <Badge variant="success">Liquidada</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {loan.interestRate}% mensual · {loan.modality === 'solo_interes' ? 'Sin plazo fijo' : `${loan.termLength} ${periodsLabel(loan)} (${effectiveMonths(loan).toFixed(1)} meses)`} · Inicio {formatDate(loan.startDate)}
                      </p>
                      {loan.note && <p className="mt-1 text-xs text-slate-400">{loan.note}</p>}
                    </div>
                    {!summary.isSettled && (
                      <Button size="sm" onClick={() => onRegisterPayment(loan)}>
                        <Receipt size={16} /> Registrar Pago
                      </Button>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progreso: {formatCurrency(summary.totalPaid)} de {formatCurrency(summary.totalExpected)}</span>
                      <span className="font-semibold text-teal-600">{summary.progressPct.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={summary.progressPct} />
                  </div>

                  {/* Summary Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Capital pendiente</p>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(summary.remainingCapital)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Interés cobrado</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.paidInterest)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Pagos realizados</p>
                      <p className="text-sm font-bold text-slate-800">{summary.paymentCount}</p>
                    </div>
                    {next && (
                      <div className="rounded-xl bg-amber-50 p-3">
                        <p className="text-xs text-amber-500">Próxima cuota {periodLabel(loan)}</p>
                        <p className="text-sm font-bold text-amber-700">{formatCurrency(next.amount)}</p>
                        <p className="text-[10px] text-amber-500">{formatDate(next.date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                      <FileText size={14} /> {isExpanded ? 'Ocultar' : 'Ver'} pagos ({payments.length})
                    </button>
                    <button onClick={() => setShowSchedule(showSched ? null : loan.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                      <Calendar size={14} /> {showSched ? 'Ocultar' : 'Ver'} plan de cuotas
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar este préstamo y todos sus pagos?')) store.deleteLoan(loan.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>

                {/* Payment History */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    {payments.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No se han registrado pagos</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((p) => {
                          const conceptLabels = {
                            cuota: 'Cuota',
                            interes: 'Interés',
                            capital: 'Capital',
                            mixto: 'Mixto',
                          };
                          return (
                            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white border border-slate-100 p-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                  <TrendingUp size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800">
                                    {formatCurrency(p.amount)} <span className="text-xs font-normal text-slate-400">· {conceptLabels[p.concept]}</span>
                                  </p>
                                  <p className="text-xs text-slate-400">{formatDate(p.date)} · {p.receiptNo} · {p.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}</p>
                                  {p.note && <p className="text-xs text-slate-400 italic mt-0.5">{p.note}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => onViewReceipt(p)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                  <Receipt size={12} /> Recibo
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('¿Eliminar este pago?')) store.deletePayment(p.id);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Schedule */}
                {showSched && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    <ScheduleTable loan={loan} payments={store.state.payments} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleTable({ loan, payments }: { loan: Loan; payments: Payment[] }) {
  const schedule = generateSchedule(loan, payments);
  const paidCount = payments.filter((p) => p.loanId === loan.id).length;
  const periodWord = loan.frequency === 'diario' ? 'Día' : loan.frequency === 'semanal' ? 'Sem.' : 'Mes';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
            <th className="py-2 pr-3 font-medium">{periodWord}</th>
            <th className="py-2 pr-3 font-medium">Fecha</th>
            <th className="py-2 pr-3 font-medium">Pago</th>
            <th className="py-2 pr-3 font-medium text-right">Interés</th>
            <th className="py-2 pr-3 font-medium text-right">Capital</th>
            <th className="py-2 font-medium text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, i) => (
            <tr key={i} className={`border-b border-slate-100 ${i < paidCount ? 'opacity-50' : ''}`}>
              <td className="py-2 pr-3 font-medium text-slate-700">
                {i < paidCount && <span className="text-emerald-500 mr-1">✓</span>}
                {row.month}
              </td>
              <td className="py-2 pr-3 text-slate-600">{formatDate(row.date)}</td>
              <td className="py-2 pr-3 text-right text-slate-700">{formatCurrency(row.payment)}</td>
              <td className="py-2 pr-3 text-right text-slate-500">{formatCurrency(row.interest)}</td>
              <td className="py-2 pr-3 text-right text-slate-500">{formatCurrency(row.capital)}</td>
              <td className="py-2 text-right font-medium text-slate-700">{formatCurrency(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
