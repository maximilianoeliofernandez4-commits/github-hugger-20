import { useMemo, useState } from 'react';
import type { Store } from '@/hooks/useStore';
import { Card, Badge, Select, EmptyState } from './ui';
import { formatCurrency, formatDate, monthKey, todayISO } from '@/lib/format';
import { computeSummary, overdueInfo } from '@/lib/loan';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Wallet, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  store: Store;
  onClientClick: (clientId: string) => void;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y?.slice(2)}`;
};
const shortMoney = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M` : v >= 1000 ? `${Math.round(v / 1000).toLocaleString('es-AR')} mil` : String(v);

export function Reports({ store, onClientClick }: Props) {
  const today = todayISO();
  const { loans, payments, clients } = store.state;

  const monthOptions = useMemo(() => {
    const keys: string[] = [];
    const d = new Date(today + 'T00:00:00');
    for (let i = 0; i < 12; i++) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      keys.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  }, [today]);

  const [month, setMonth] = useState(monthOptions[0] ?? monthKey(today));

  const data = useMemo(() => {
    const monthPays = payments.filter((p) => monthKey(p.date) === month);
    const profit = monthPays.reduce((s, p) => s + p.toInterest, 0);
    const capitalBack = monthPays.reduce((s, p) => s + p.toCapital, 0);
    const lentThisMonth = loans.filter((l) => monthKey(l.startDate) === month).reduce((s, l) => s + l.capital, 0);

    let pendingCapital = 0;
    let pendingInterest = 0;
    const overdue: { clientId: string; name: string; amount: number; missed: number; daysLate: number; since: string }[] = [];
    const lateClients = new Set<string>();
    const activeClients = new Set<string>();

    for (const loan of loans) {
      const s = computeSummary(loan, payments);
      if (s.isSettled) continue;
      pendingCapital += s.remainingCapital;
      pendingInterest += s.remainingInterest;
      activeClients.add(loan.clientId);
      const o = overdueInfo(loan, payments, today);
      if (o.missed > 0) {
        lateClients.add(loan.clientId);
        const name = clients.find((c) => c.id === loan.clientId)?.name ?? '—';
        overdue.push({ clientId: loan.clientId, name, amount: o.amountDue, missed: o.missed, daysLate: o.daysLate, since: o.firstDueDate ?? '' });
      }
    }
    overdue.sort((a, b) => b.amount - a.amount);

    const chart = [...monthOptions].slice(0, 6).reverse().map((k) => {
      const ps = payments.filter((p) => monthKey(p.date) === k);
      return {
        mes: monthLabel(k),
        Ganancia: Math.round(ps.reduce((s, p) => s + p.toInterest, 0)),
        'Capital cobrado': Math.round(ps.reduce((s, p) => s + p.toCapital, 0)),
      };
    });

    return {
      profit,
      capitalBack,
      lentThisMonth,
      pendingCapital,
      pendingInterest,
      overdue,
      overdueTotal: overdue.reduce((s, o) => s + o.amount, 0),
      lateCount: lateClients.size,
      upToDateCount: activeClients.size - lateClients.size,
      chart,
    };
  }, [loans, payments, clients, month, monthOptions, today]);

  const pie = [
    { name: 'Al día', value: data.upToDateCount, color: '#0d9488' },
    { name: 'Atrasados', value: data.lateCount, color: '#e11d48' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">Ganancias, saldos pendientes y clientes atrasados.</p>
        </div>
        <div className="w-48">
          <Select label="Mes" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<TrendingUp size={20} />} tone="emerald" label={`Ganancia de ${monthLabel(month)}`} value={formatCurrency(data.profit)} sub="Intereses cobrados" />
        <Stat icon={<Wallet size={20} />} tone="teal" label={`Capital cobrado en ${monthLabel(month)}`} value={formatCurrency(data.capitalBack)} sub={`Prestado ese mes: ${formatCurrency(data.lentThisMonth)}`} />
        <Stat icon={<Clock size={20} />} tone="amber" label="Saldo pendiente total" value={formatCurrency(data.pendingCapital + data.pendingInterest)} sub={`Capital ${formatCurrency(data.pendingCapital)} + interés ${formatCurrency(data.pendingInterest)}`} />
        <Stat icon={<AlertTriangle size={20} />} tone="rose" label="Atrasado hoy" value={formatCurrency(data.overdueTotal)} sub={`${data.lateCount} ${data.lateCount === 1 ? 'persona' : 'personas'} atrasadas`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-800">Últimos 6 meses</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Ganancia" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Capital cobrado" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Clientes con deuda</h2>
          {data.upToDateCount + data.lateCount === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No hay préstamos activos.</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-teal-700"><CheckCircle2 size={14} /> {data.upToDateCount} al día</span>
                <span className="flex items-center gap-1.5 text-rose-600"><AlertTriangle size={14} /> {data.lateCount} atrasados</span>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-slate-800">Personas atrasadas</h2>
        {data.overdue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={24} />} title="Nadie atrasado" description="Todos tus clientes están al día con sus pagos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Debía pagar desde</th>
                  <th className="py-2 pr-3 font-medium text-right">Pagos sin hacer</th>
                  <th className="py-2 pr-3 font-medium text-right">Días de atraso</th>
                  <th className="py-2 font-medium text-right">Monto atrasado</th>
                </tr>
              </thead>
              <tbody>
                {data.overdue.map((o, i) => (
                  <tr key={i} onClick={() => onClientClick(o.clientId)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{o.name}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{formatDate(o.since)}</td>
                    <td className="py-2.5 pr-3 text-right"><Badge variant="warning">{o.missed}</Badge></td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{o.daysLate}</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">{formatCurrency(o.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-600',
  teal: 'bg-teal-50 text-teal-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
} as const;

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: keyof typeof TONES }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}
