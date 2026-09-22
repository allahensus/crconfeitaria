'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Sparkles, CheckCircle2, XCircle, PackageCheck } from 'lucide-react';

export default function AdminAssistantApprovalsPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes?createdByAssistant=true');
      const data = await res.json();
      if (Array.isArray(data)) setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Converter este orçamento em pedido confirmado?')) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convertToOrder: true }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const visible = filter === 'PENDING' ? quotes.filter((q) => q.status === 'PENDING') : quotes;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C27360]" /> Pedidos da Açucena
          </h1>
          <p className="text-xs md:text-sm text-[#645451]">
            Pedidos que a assistente de IA montou na conversa com o cliente -- nada vira pedido de verdade sem você revisar e aprovar aqui.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === 'PENDING' ? 'bg-[#C27360] text-white' : 'bg-white border border-[#F2D7D0] text-[#645451]'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === 'ALL' ? 'bg-[#C27360] text-white' : 'bg-white border border-[#F2D7D0] text-[#645451]'}`}
          >
            Todos
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#F2D7D0] p-8">
            <p className="text-[#645451] font-medium">
              {filter === 'PENDING' ? 'Nenhum pedido da Açucena esperando aprovação.' : 'A Açucena ainda não criou nenhum pedido.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-2xl border border-[#F2D7D0] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#A75644]">{q.quoteNumber}</span>
                    <h3 className="font-serif font-bold text-lg text-[#4A231A]">{q.customerName}</h3>
                    <p className="text-xs text-[#645451]">{q.customerWhatsapp} -- {formatDateTime(q.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-[#4A231A] font-serif">{formatCurrency(q.finalTotal)}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      q.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      q.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                      q.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F2D7D0] space-y-1">
                  {q.items?.map((item: any) => (
                    <p key={item.id} className="text-xs text-[#645451]">
                      {item.quantity}x {item.productName} {item.variation ? `(${item.variation})` : ''}
                    </p>
                  ))}
                  {q.themeNotes && <p className="text-xs text-[#645451] italic">"{q.themeNotes}"</p>}
                </div>

                {q.status === 'PENDING' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'APPROVED')}
                      className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'REJECTED')}
                      className="flex-1 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}

                {q.status === 'APPROVED' && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleConvert(q.id)}
                      className="w-full px-4 py-2 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> Converter em Pedido
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
