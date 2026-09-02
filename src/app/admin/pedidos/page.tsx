'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { PixChargeModal } from '@/components/admin/PixChargeModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag,
  Kanban,
  List,
  Plus,
  Clock,
  CheckCircle2,
  DollarSign,
  User,
  Calendar,
  X,
  CreditCard,
  MessageCircle,
} from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'NOVO', title: 'Novo Pedido', color: 'border-blue-300 bg-blue-50/50' },
  { id: 'AGUARDANDO_CONFIRMACAO', title: 'Aguardando Confirmação', color: 'border-amber-300 bg-amber-50/50' },
  { id: 'CONFIRMADO', title: 'Confirmado', color: 'border-purple-300 bg-purple-50/50' },
  { id: 'EM_PRODUCAO', title: 'Em Produção 🎂', color: 'border-orange-300 bg-orange-50/50' },
  { id: 'PRONTO', title: 'Pronto p/ Entrega 🎉', color: 'border-emerald-300 bg-emerald-50/50' },
  { id: 'ENTREGUE', title: 'Concluído / Entregue', color: 'border-gray-300 bg-gray-50/50' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Payment Modal state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !paymentAmount) return;

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addPayment: {
            amount: parseFloat(paymentAmount),
            paymentMethod,
          },
        }),
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        setPaymentAmount('');
        loadOrders();
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão de Pedidos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Acompanhe os pedidos no Quadro Kanban ou em Lista com controle de produção e pagamento
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-[#F2D7D0] flex items-center">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'kanban' ? 'bg-[#C27360] text-white shadow-sm' : 'text-[#645451]'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" /> Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'list' ? 'bg-[#C27360] text-white shadow-sm' : 'text-[#645451]'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board View */}
        {viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-6">
            {STATUS_COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`w-72 flex-shrink-0 rounded-2xl p-4 border ${col.color} flex flex-col justify-between min-h-[500px]`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-xs text-[#4A231A] uppercase tracking-wider">
                        {col.title}
                      </h3>
                      <span className="w-6 h-6 rounded-full bg-white text-[#C27360] text-xs font-bold flex items-center justify-center border border-[#F2D7D0]">
                        {colOrders.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white p-4 rounded-xl border border-[#F2D7D0] shadow-card space-y-2 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-[#4A231A]">
                              {order.orderNumber}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                order.paymentStatus === 'PAGO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>

                          <div className="font-semibold text-xs text-[#4A231A]">
                            {order.customerName}
                          </div>

                          <div className="text-[11px] text-[#645451] space-y-0.5">
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#C27360]" /> Entrega: {formatDate(order.deliveryDate)}
                            </p>
                            {order.items && order.items.length > 0 && (
                              <p className="font-medium text-[#874132] line-clamp-1">
                                {order.items[0].productName} ({order.items[0].variationName || '1x'})
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-extrabold text-sm text-[#C27360] font-serif">
                              {formatCurrency(order.totalAmount)}
                            </span>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 rounded bg-[#FAF6F4] text-[#4A231A] text-[10px] font-bold border border-[#F2D7D0]"
                            >
                              Ver / Atualizar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View Table */
          <div className="bg-white rounded-3xl border border-[#F2D7D0] overflow-hidden shadow-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDF7F6] border-b border-[#F2D7D0] text-[11px] uppercase tracking-wider font-bold text-[#A75644]">
                  <th className="p-4">Pedido</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Data Entrega</th>
                  <th className="p-4">Status Produção</th>
                  <th className="p-4">Pagamento</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2D7D0]/60 text-xs text-[#4A3531]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FAF6F4]">
                    <td className="p-4 font-bold text-[#4A231A]">{o.orderNumber}</td>
                    <td className="p-4 font-semibold">{o.customerName}</td>
                    <td className="p-4">{formatDate(o.deliveryDate)}</td>
                    <td className="p-4">
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        className="p-1 rounded bg-[#FAF6F4] border border-[#F2D7D0] text-xs font-bold"
                      >
                        {STATUS_COLUMNS.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(o.paidAmount)} / {formatCurrency(o.totalAmount)}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-[#C27360] font-serif">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1 rounded bg-white border border-[#F2D7D0] font-bold text-xs"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Detail & Payment Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <div>
                  <span className="text-xs font-bold text-[#C27360] uppercase">{selectedOrder.orderNumber}</span>
                  <h3 className="font-serif font-bold text-xl text-[#4A231A]">Gerenciar Pedido</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF6F4] border border-[#F2D7D0]">
                  <p><strong>Cliente:</strong> {selectedOrder.customerName}</p>
                  <p><strong>WhatsApp:</strong> {selectedOrder.customerWhatsapp}</p>
                  <p><strong>Data Entrega:</strong> {formatDate(selectedOrder.deliveryDate)}</p>
                  {selectedOrder.preferredPaymentMethod && (
                    <p><strong>Forma de Pagamento Preferida:</strong> {selectedOrder.preferredPaymentMethod}</p>
                  )}
                  {selectedOrder.depositAmount ? (
                    <p><strong>Sinal Sugerido:</strong> {formatCurrency(selectedOrder.depositAmount)}</p>
                  ) : null}
                  {selectedOrder.notes && <p><strong>Notas:</strong> {selectedOrder.notes}</p>}
                </div>

                <div>
                  <h4 className="font-bold text-[#A75644] uppercase text-[11px] mb-2">Alterar Status do Pedido:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_COLUMNS.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          handleUpdateStatus(selectedOrder.id, st.id);
                          setSelectedOrder({ ...selectedOrder, status: st.id });
                        }}
                        className={`p-2 rounded-lg text-left text-xs font-semibold border transition-all ${
                          selectedOrder.status === st.id
                            ? 'bg-[#C27360] text-white border-[#C27360]'
                            : 'bg-white text-[#4A231A] border-[#F2D7D0] hover:bg-[#FAF6F4]'
                        }`}
                      >
                        {st.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financial Payment Summary */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center font-bold text-[#4A231A]">
                    <span>Total do Pedido:</span>
                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-emerald-800">
                    <span>Total Já Pago:</span>
                    <span>{formatCurrency(selectedOrder.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-extrabold text-rose-700">
                    <span>Restante a Receber:</span>
                    <span>{formatCurrency(Math.max(0, selectedOrder.totalAmount - selectedOrder.paidAmount))}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setIsPixModalOpen(true)}
                      className="py-2 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold text-xs shadow-sm"
                    >
                      Gerar Cobrança Pix
                    </button>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
                    >
                      + Registrar Pagamento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4">
              <h3 className="font-serif font-bold text-xl text-[#4A231A]">Registrar Pagamento</h3>
              
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#A75644] uppercase mb-1">
                    Valor Pago (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ex: 120.00"
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A75644] uppercase mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartao">Cartão de Crédito/Débito</option>
                    <option value="Transferencia">Transferência</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow"
                  >
                    Confirmar Pagamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPixModalOpen && selectedOrder && (
          <PixChargeModal
            onClose={() => setIsPixModalOpen(false)}
            defaultAmount={Math.max(0, selectedOrder.totalAmount - selectedOrder.paidAmount)}
            txid={selectedOrder.orderNumber}
            customerName={selectedOrder.customerName}
          />
        )}

      </main>
    </div>
  );
}
