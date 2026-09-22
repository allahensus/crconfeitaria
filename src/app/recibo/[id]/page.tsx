'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const whatsapp = searchParams.get('whatsapp') || '';

  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !whatsapp) {
      setErrorMsg('Link de recibo incompleto.');
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${id}/recibo?whatsapp=${encodeURIComponent(whatsapp)}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setData(json);
        else setErrorMsg(json.error || 'Não foi possível carregar o recibo.');
      })
      .catch(() => setErrorMsg('Erro ao conectar ao servidor.'))
      .finally(() => setLoading(false));
  }, [id, whatsapp]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-deep)] hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a loja
        </Link>

        {loading && <p className="text-center text-sm text-[var(--color-text-soft)]">Carregando...</p>}

        {errorMsg && (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card p-6 text-center">
            <p className="text-sm text-[var(--color-heading)] font-semibold">{errorMsg}</p>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-card overflow-hidden">
            <div className="bg-[var(--color-accent-deep)] text-white p-6 text-center">
              <Receipt className="w-8 h-8 mx-auto mb-2" />
              <h1 className="font-serif text-xl font-bold">Recibo do Pedido</h1>
              <p className="text-sm opacity-90">{data.orderNumber}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-semibold">
                  Documento simulado para fins de demonstração, sem validade fiscal.
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Cliente</span>
                <p className="text-sm text-[var(--color-heading)] font-semibold">{data.customerName}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Itens</span>
                {data.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-[var(--color-text-soft)] py-1">
                    <span>{item.quantity}x {item.productName}{item.variationName ? ` (${item.variationName})` : ''}</span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-soft)]">Total</span>
                  <span className="font-bold text-[var(--color-heading)]">{formatCurrency(data.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-soft)]">Pago</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(data.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-[var(--color-text-soft)]">Status</span>
                  <span className="font-bold text-[var(--color-heading)]">{data.paymentStatus}</span>
                </div>
              </div>

              {data.payments?.length > 0 && (
                <div className="pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[10px] font-bold uppercase text-[var(--color-accent-strong)]">Pagamentos</span>
                  {data.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-[var(--color-text-soft)] py-1">
                      <span>{p.paymentMethod} -- {formatDate(p.paidAt)}</span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
