import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wallet } from 'lucide-react';

export function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg('Email o contraseña incorrectos (o falta confirmar el email).');
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : 'Listo. Revisá tu email y tocá el enlace para confirmar la cuenta; después entrá.');
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white"><Wallet size={20} /></div>
          <div>
            <h1 className="text-base font-bold text-slate-900">PrestaControl</h1>
            <p className="text-xs text-slate-500">{mode === 'in' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</p>
          </div>
        </div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
        {msg && <p className="mb-3 text-sm text-slate-600">{msg}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }} className="mt-3 w-full text-sm text-teal-700 hover:underline">
          {mode === 'in' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  );
}
