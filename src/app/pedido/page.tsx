'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Package, CheckCircle2, Clock, XCircle, ArrowLeft, Truck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const ORDER_TIMELINE = ['NOVO', 'CONFIRMADO', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE'];

export default function TrackOrderPage() {
  const [numero, setNumero] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setResult(null);
    try {
      const params = new URLSearchParams({ numero, whatsapp });
      const res = await fetch(`/api/track?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setErrorMsg(data.error || 'Não foi possível localizar seu pedido.');
      }
    } catch (err) {
      setErrorMsg('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const isCancelled = result?.status === 'CANCELADO' || result?.status === 'REJECTED';
  const currentStepIndex = result ? ORDER_TIMELINE.indexOf(result.status) : -1;

  return (
    <div className="min-h-screen bg-[#FAF6F4] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#874132] hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a loja
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#F9ECE9] text-[#C27360] flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#4A231A]">Acompanhe seu Pedido</h1>
          <p className="text-sm text-[#645451] mt-1">
            Digite o número do pedido/orçamento e o WhatsApp usado na encomenda
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
              Número do Pedido ou Orçamento
            </label>
            <input
              type="text"
              required
              placeholder="Ex: PED-2026-0001 ou ORC-2026-0001"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm font-mono uppercase text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
              WhatsApp usado na encomenda
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 11999998888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Search className="w-4 h-4" /> {loading ? 'Buscando...' : 'Consultar'}
          </button>
          {errorMsg && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
              {errorMsg}
            </p>
          )}
        </form>

        {result && (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card p-6 mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A75644] block">
                  {result.type === 'order' ? 'Pedido' : 'Orçamento'}
                </span>
                <span className="font-serif font-bold text-lg text-[#4A231A]">{result.number}</span>
              </div>
              <span
                className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full ${
                  isCancelled
                    ? 'bg-red-100 text-red-700'
                    : result.status === 'ENTREGUE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#F9ECE9] text-[#A75644]'
                }`}
              >
                {result.statusLabel}
              </span>
            </div>

            {/* Timeline (orders only, not cancelled) */}
            {result.type === 'order' && !isCancelled && (
              <div className="flex items-center justify-between px-1">
                {ORDER_TIMELINE.map((step, i) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          i <= currentStepIndex ? 'bg-[#C27360] text-white' : 'bg-[#F2D7D0] text-white'
                        }`}
                      >
                        {i <= currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
                      </div>
                    </div>
                    {i < ORDER_TIMELINE.length - 1 && (
                      <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-[#C27360]' : 'bg-[#F2D7D0]'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-xs font-semibold">
                <XCircle className="w-4 h-4" /> Esse {result.type === 'order' ? 'pedido' : 'orçamento'} foi cancelado.
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-[#F2D7D0]">
              {result.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-[#4A3531]">
                    {item.quantity}x {item.productName} {item.variationName ? `(${item.variationName})` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#645451] pt-2 border-t border-[#F2D7D0]">
              <Truck className="w-3.5 h-3.5 text-[#C27360]" />
              {result.deliveryDate ? formatDate(result.deliveryDate) : 'Data a combinar'}
            </div>

            <div className="bg-[#FDF7F6] rounded-2xl p-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#645451]">Total</span>
                <span className="font-bold text-[#4A231A]">{formatCurrency(result.totalAmount)}</span>
              </div>
              {result.type === 'order' && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#645451]">Já pago</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(result.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-[#F2D7D0]">
                    <span className="text-[#4A231A]">Restante</span>
                    <span className="text-rose-700">{formatCurrency(Math.max(0, result.totalAmount - result.paidAmount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
