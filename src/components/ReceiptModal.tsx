import { useRef, useEffect } from 'react';
import { Modal, Button } from './ui';
import type { Payment, Client, Loan } from '@/types';
import { formatCurrency, formatDateLong } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
  client: Client | null;
  loan: Loan | null;
}

export function ReceiptModal({ open, onClose, payment, client, loan }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && payment) {
      // Auto-trigger print dialog
      const timer = setTimeout(() => handlePrint(), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, payment]);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=420,height=720');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
      <meta charset="utf-8" />
      <title>Comprobante ${payment?.receiptNo ?? ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; padding: 20px; color: #1e293b; }
        .receipt { max-width: 380px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: #0f766e; color: white; padding: 24px 20px; text-align: center; }
        .header h1 { font-size: 20px; font-weight: 700; }
        .header p { font-size: 11px; opacity: 0.8; margin-top: 4px; }
        .receipt-no { font-size: 13px; margin-top: 8px; font-weight: 600; opacity: 0.9; }
        .body { padding: 20px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 13px; color: #64748b; }
        .value { font-size: 13px; font-weight: 600; color: #1e293b; }
        .amount-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; margin: 12px 0; text-align: center; }
        .amount-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .amount-box .amount { font-size: 28px; font-weight: 800; color: #0f766e; margin-top: 4px; }
        .concept-badge { display: inline-block; background: #ecfeff; border: 1px solid #cffafe; color: #0e7490; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 600; }
        .footer { text-align: center; padding: 16px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
        .footer p { font-size: 11px; color: #94a3b8; }
        .sign-line { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align: center; font-size: 11px; color: #94a3b8; }
        @media print { body { background: white; padding: 0; } .receipt { box-shadow: none; } }
      </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleWhatsApp = () => {
    if (!payment || !client || !loan) return;
    const conceptLabels = {
      cuota: 'Cuota completa',
      interes: 'Pago de Interés Mensual',
      capital: 'Abono a Capital',
      mixto: 'Pago Mixto (Interés + Capital)',
    };
    const text = `*COMPROBANTE DE PAGO ${payment.receiptNo}*\n\n` +
      `Cliente: ${client.name}\n` +
      `Fecha: ${formatDateLong(payment.date)}\n` +
      `Concepto: ${conceptLabels[payment.concept]}\n` +
      `Monto recibido: ${formatCurrency(payment.amount)}\n` +
      `Método: ${payment.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}\n` +
      `Aplicado a interés: ${formatCurrency(payment.toInterest)}\n` +
      `Aplicado a capital: ${formatCurrency(payment.toCapital)}\n` +
      `Saldo de capital pendiente: ${formatCurrency(payment.remainingCapital)}\n` +
      `Saldo de interés pendiente: ${formatCurrency(payment.remainingInterest)}\n\n` +
      `¡Gracias por su pago!`;
    const phone = client.phone.replace(/\D/g, '');
    const waNumber = phone.length === 10 ? '57' + phone : phone;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!payment || !client || !loan) return null;

  const conceptLabels = {
    cuota: 'Cuota completa',
    interes: 'Pago de Interés Mensual',
    capital: 'Abono a Capital',
    mixto: 'Pago Mixto (Interés + Capital)',
  };

  return (
    <Modal open={open} onClose={onClose} title="Comprobante de Pago" size="sm">
      <div ref={receiptRef}>
        <div className="receipt">
          <div className="header" style={{ background: '#0f766e', color: 'white', padding: '24px 20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Comprobante de Pago</h1>
            <p style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>Préstamo Privado</p>
            <div className="receipt-no" style={{ fontSize: '13px', marginTop: '8px', fontWeight: 600, opacity: 0.9 }}>
              {payment.receiptNo}
            </div>
          </div>
          <div className="body" style={{ padding: '20px' }}>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Cliente</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600 }}>{client.name}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Fecha</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600 }}>{formatDateLong(payment.date)}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Método</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600 }}>{payment.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}</span>
            </div>
            <div className="amount-box" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '12px', padding: '16px', margin: '12px 0', textAlign: 'center' }}>
              <div className="label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Monto Recibido</div>
              <div className="amount" style={{ fontSize: '28px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>{formatCurrency(payment.amount)}</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span className="concept-badge" style={{ display: 'inline-block', background: '#ecfeff', border: '1px solid #cffafe', color: '#0e7490', borderRadius: '999px', padding: '4px 12px', fontSize: '11px', fontWeight: 600 }}>
                {conceptLabels[payment.concept]}
              </span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Aplicado a interés</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(payment.toInterest)}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Aplicado a capital</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(payment.toCapital)}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Saldo capital pendiente</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600, color: '#e11d48' }}>{formatCurrency(payment.remainingCapital)}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span className="label" style={{ fontSize: '13px', color: '#64748b' }}>Saldo interés pendiente</span>
              <span className="value" style={{ fontSize: '13px', fontWeight: 600, color: '#e11d48' }}>{formatCurrency(payment.remainingInterest)}</span>
            </div>
            {payment.note && (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                Nota: {payment.note}
              </div>
            )}
            <div className="sign-line" style={{ marginTop: '24px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
              Firma del Prestamista
            </div>
          </div>
          <div className="footer" style={{ textAlign: 'center', padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Este comprobante es válido como constancia de pago privado.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handlePrint}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Descargar PDF
          </Button>
          <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700 shadow-green-600/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose} className="w-full">Cerrar</Button>
      </div>
    </Modal>
  );
}
