'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PixChargeModal } from '@/components/admin/PixChargeModal';
import { formatCurrency, formatDate, formatWhatsappForUrl } from '@/lib/utils';
import { FileText, ArrowRight, CheckCircle2, MessageCircle, Clock, Search, Eye, ShoppingBag, Tag, QrCode } from 'lucide-react';

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const loadQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (Array.isArray(data)) setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const handleConvertToOrder = async (quoteId: string) => {
    if (confirm('Deseja converter este orçamento em um novo pedido confirmado?')) {
      try {
        const res = await fetch(`/api/quotes/${quoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ convertToOrder: true }),
        });

        if (res.ok) {
          alert('Orçamento convertido em Pedido com sucesso!');
          loadQuotes();
          if (selectedQuote?.id === quoteId) setSelectedQuote(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateStatus = async (quoteId: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadQuotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectQuote = (quoteId: string) => {
    if (confirm('Deseja recusar este orçamento? O cliente não será notificado automaticamente.')) {
      handleUpdateStatus(quoteId, 'REJECTED');
      if (selectedQuote?.id === quoteId) setSelectedQuote(null);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão de Orçamentos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Visualize solicitações enviadas pelos clientes e converta em pedidos confirmados
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F2D7D0] bg-white text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'PENDING', 'APPROVED', 'CONVERTED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-[#C27360] text-white shadow-sm'
                    : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
                }`}
              >
                {st === 'ALL' && 'Todos'}
                {st === 'PENDING' && 'Pendentes'}
                {st === 'APPROVED' && 'Aprovados'}
                {st === 'CONVERTED' && 'Convertidos'}
                {st === 'REJECTED' && 'Rejeitados'}
              </button>
            ))}
          </div>
        </div>

        {/* Quotes List Table */}
        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando solicitações de orçamento...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDF7F6] border-b border-[#F2D7D0] text-[11px] uppercase tracking-wider font-bold text-[#A75644]">
                    <th className="p-4">Código</th>
                    <th className="p-4">Cliente / WhatsApp</th>
                    <th className="p-4">Data Festa</th>
                    <th className="p-4">Total Estimado</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2D7D0]/60 text-xs text-[#4A3531]">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-[#FAF6F4] transition-colors">
                      <td className="p-4 font-bold text-[#4A231A]">{q.quoteNumber}</td>
                      <td className="p-4">
                        <div className="font-semibold text-[#4A231A]">{q.customerName}</div>
                        <a
                          href={`https://wa.me/${formatWhatsappForUrl(q.customerWhatsapp)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 font-medium hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> {q.customerWhatsapp}
                        </a>
                      </td>
                      <td className="p-4 font-medium">{formatDate(q.eventDate)}</td>
                      <td className="p-4 font-extrabold text-[#C27360] font-serif">
                        {formatCurrency(q.finalTotal)}
                        {q.couponCode && (
                          <span className="block text-[9px] font-bold text-emerald-700 uppercase mt-0.5">
                            🏷️ {q.couponCode}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            q.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : q.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : q.status === 'CONVERTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {q.status === 'PENDING' && 'Aguardando Resposta'}
                          {q.status === 'APPROVED' && 'Aprovado'}
                          {q.status === 'CONVERTED' && 'Convertido em Pedido'}
                          {q.status === 'REJECTED' && 'Cancelado'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedQuote(q)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] font-semibold hover:bg-[#FDF7F6]"
                        >
                          Ver Detalhes
                        </button>
                        {q.status !== 'CONVERTED' && q.status !== 'REJECTED' && (
                          <>
                            <button
                              onClick={() => handleConvertToOrder(q.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm"
                            >
                              Converter em Pedido
                            </button>
                            <button
                              onClick={() => handleRejectQuote(q.id)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 font-bold hover:bg-red-50"
                            >
                              Recusar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quote Detail Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <div>
                  <span className="text-xs font-bold text-[#C27360] uppercase">{selectedQuote.quoteNumber}</span>
                  <h3 className="font-serif font-bold text-xl text-[#4A231A]">Detalhes do Orçamento</h3>
                </div>
                <button onClick={() => setSelectedQuote(null)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#4A3531]">
                <div className="p-3 rounded-xl bg-[#FAF6F4] border border-[#F2D7D0]">
                  <p><strong>Cliente:</strong> {selectedQuote.customerName}</p>
                  <p><strong>WhatsApp:</strong> {selectedQuote.customerWhatsapp}</p>
                  <p><strong>Data Desejada:</strong> {formatDate(selectedQuote.eventDate)}</p>
                  <p><strong>Forma de Pagamento:</strong> {selectedQuote.preferredPaymentMethod || 'Não informado'}</p>
                  {selectedQuote.themeNotes && <p><strong>Tema/Obs:</strong> {selectedQuote.themeNotes}</p>}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#A75644] uppercase text-[11px]">Itens Solicitados:</h4>
                  {selectedQuote.items?.map((item: any) => (
                    <div key={item.id} className="p-3 rounded-xl border border-[#F2D7D0] bg-white space-y-1">
                      <div className="font-bold text-sm text-[#4A231A]">{item.productName}</div>
                      {item.variation && <p>Tamanho: {item.variation}</p>}
                      {item.cakeBase && <p>Massa: {item.cakeBase}</p>}
                      {item.filling1 && <p>Recheio 1: {item.filling1}</p>}
                      {item.frosting && !(item.variation || '').includes(item.frosting) && (
                        <p>Cobertura: {item.frosting}</p>
                      )}
                      {item.extras && <p>Adicionais: {item.extras}</p>}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-bold text-[#C27360]">
                        <span>Qtd: {item.quantity}x</span>
                        <span>Total: {formatCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedQuote.couponCode && (
                <div className="flex justify-between items-center text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Cupom {selectedQuote.couponCode}
                  </span>
                  <span className="font-bold text-emerald-800">
                    -{formatCurrency(selectedQuote.discount || 0)}
                  </span>
                </div>
              )}

              {selectedQuote.depositAmount ? (
                <div className="flex justify-between items-center text-xs bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <span className="font-bold text-amber-800 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" /> Sinal sugerido
                  </span>
                  <span className="font-bold text-amber-800">
                    {formatCurrency(selectedQuote.depositAmount)}
                  </span>
                </div>
              ) : null}

              <div className="pt-4 border-t border-[#F2D7D0] flex justify-between items-center">
                <span className="font-extrabold text-lg text-[#C27360] font-serif">
                  {formatCurrency(selectedQuote.finalTotal)}
                </span>
                {selectedQuote.status !== 'CONVERTED' && selectedQuote.status !== 'REJECTED' && (
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => setIsPixModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs hover:bg-emerald-50 flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Cobrar Sinal via Pix
                    </button>
                    <button
                      onClick={() => handleRejectQuote(selectedQuote.id)}
                      className="px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={() => handleConvertToOrder(selectedQuote.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
                    >
                      Converter em Pedido Agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isPixModalOpen && selectedQuote && (
          <PixChargeModal
            onClose={() => setIsPixModalOpen(false)}
            defaultAmount={selectedQuote.depositAmount || selectedQuote.finalTotal}
            txid={selectedQuote.quoteNumber}
            customerName={selectedQuote.customerName}
          />
        )}

      </main>
    </div>
  );
}
