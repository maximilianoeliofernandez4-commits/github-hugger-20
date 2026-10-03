import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'PrestaControl — Gestión de préstamos privados' },
      { name: 'description', content: 'Gestioná clientes, préstamos, pagos e intereses con recibos. Control completo de préstamos personales.' },
      { property: 'og:title', content: 'PrestaControl — Gestión de préstamos privados' },
      { property: 'og:description', content: 'Gestioná clientes, préstamos, pagos e intereses con recibos.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setMounted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!mounted) return <div className="min-h-screen bg-slate-50" />;
  if (!userId) return <AuthScreen />;
  return <App key={userId} userId={userId} />;
}

import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { AuthScreen } from '@/components/AuthScreen';
import { Dashboard } from '@/components/Dashboard';
import { ClientDetail } from '@/components/ClientDetail';
import { NewClientModal } from '@/components/NewClientModal';
import { NewLoanModal } from '@/components/NewLoanModal';
import { PaymentModal } from '@/components/PaymentModal';
import { ReceiptModal } from '@/components/ReceiptModal';
import { Reports } from '@/components/Reports';
import { EditLoanModal } from '@/components/EditLoanModal';
import { Button } from '@/components/ui';
import type { Client, Loan, Payment } from '@/types';
import { Wallet, Search, Plus, BarChart3, LogOut } from 'lucide-react';

function App({ userId }: { userId: string }) {
  const store = useStore(userId);
  const [view, setView] = useState<'dashboard' | 'client' | 'reports'>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewLoan, setShowNewLoan] = useState(false);
  const [loanForPayment, setLoanForPayment] = useState<Loan | null>(null);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [loanClient, setLoanClient] = useState<Client | null>(null);

  const selectedClient = store.state.clients.find((c) => c.id === selectedClientId) ?? null;
  const paymentClient = loanForPayment ? store.state.clients.find((c) => c.id === loanForPayment.clientId) ?? null : null;
  const lastPaymentLoan = lastPayment ? store.state.loans.find((l) => l.id === lastPayment.loanId) ?? null : null;

  const handleClientClick = (clientId: string) => {
    setSelectedClientId(clientId);
    setView('client');
  };

  const handleNewLoanForClient = (client: Client) => {
    setLoanClient(client);
    setShowNewLoan(true);
  };

  const handleRegisterPayment = (loan: Loan) => {
    setLoanForPayment(loan);
  };

  const handlePaymentRegistered = (payment: Payment) => {
    setLastPayment(payment);
  };

  if (!store.ready) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Cargando tus datos…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm shadow-teal-600/20">
                <Wallet size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-none">PrestaControl</h1>
                <p className="text-[11px] text-slate-400 leading-none mt-0.5">Gestión de préstamos privados</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant={view === 'reports' ? 'primary' : 'outline'} size="sm" onClick={() => setView(view === 'reports' ? 'dashboard' : 'reports')}>
                <BarChart3 size={16} /> <span className="hidden sm:inline">Reportes</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNewClient(true)}>
                <Plus size={16} /> <span className="hidden sm:inline">Cliente</span>
              </Button>
              <Button size="sm" onClick={() => { setLoanClient(null); setShowNewLoan(true); }}>
                <Plus size={16} /> <span className="hidden sm:inline">Préstamo</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem('prestamos_app_v3'); void supabase.auth.signOut(); }} title="Salir">
                <LogOut size={16} />
              </Button>
            </div>
          </div>

          {/* Search bar - only on dashboard */}
          {view === 'dashboard' && (
            <div className="pb-3">
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/15"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {view === 'dashboard' && (
          <Dashboard
            store={store}
            search={search}
            onClientClick={handleClientClick}
            onNewClient={() => setShowNewClient(true)}
            onNewLoan={() => { setLoanClient(null); setShowNewLoan(true); }}
          />
        )}

        {view === 'reports' && <Reports store={store} onClientClick={handleClientClick} />}

        {view === 'client' && selectedClient && (
          <ClientDetail
            store={store}
            client={selectedClient}
            onBack={() => { setView('dashboard'); setSelectedClientId(null); }}
            onNewLoan={handleNewLoanForClient}
            onRegisterPayment={handleRegisterPayment}
            onViewReceipt={(p) => setLastPayment(p)}
            onEditLoan={(l) => setLoanToEdit(l)}
          />
        )}
      </main>

      {/* Modals */}
      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} store={store} />
      <NewLoanModal open={showNewLoan} onClose={() => setShowNewLoan(false)} store={store} client={loanClient} fixedClient={!!loanClient} />
      <EditLoanModal open={!!loanToEdit} onClose={() => setLoanToEdit(null)} store={store} loan={loanToEdit} />
      <PaymentModal
        open={!!loanForPayment}
        onClose={() => setLoanForPayment(null)}
        store={store}
        loan={loanForPayment}
        client={paymentClient}
        onPaymentRegistered={handlePaymentRegistered}
      />
      <ReceiptModal
        open={!!lastPayment}
        onClose={() => setLastPayment(null)}
        payment={lastPayment}
        client={lastPayment ? store.state.clients.find((c) => c.id === lastPaymentLoan?.clientId) ?? null : null}
        loan={lastPaymentLoan}
      />
    </div>
  );
}
