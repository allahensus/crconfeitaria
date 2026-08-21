'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, Search, MessageCircle, Cake, Mail, ShieldCheck, Gift, Tag, X } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'birthdays'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenCustomerDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (data) setSelectedCustomer(data);
    } catch (err) {
      console.error(err);
    }
  };

  const currentMonth = new Date().getMonth();

  const isBirthdayThisMonth = (birthDateStr?: string) => {
    if (!birthDateStr) return false;
    const d = new Date(birthDateStr);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth;
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterType === 'birthdays') {
      return matchesSearch && isBirthdayThisMonth(c.birthDate);
    }
    return matchesSearch;
  });

  const sendBirthdayWish = (c: any) => {
    const text = `🎉 *FELIZ ANIVERSÁRIO, ${c.name.split(' ')[0].toUpperCase()}!* 🎂🎈\n\nA Confeitaria Cinthia Rodrigues deseja a você um dia repleto de doçura, amor e momentos inesquecíveis!\n\nComo nosso presente especial de aniversário, preparamos um *cupom de 10% DE DESCONTO* na sua próxima encomenda de bolo ou biscoitos! 💕\n\nCupom: *NIVER10*\n\nQuer encomendar o seu bolo de aniversário com o desconto? É só responder essa mensagem! ✨`;
    window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendPromoMsg = (c: any) => {
    const text = `✨ *NOVIDADES EXCLUSIVAS DA CONFEITARIA CINTHIA RODRIGUES!* 🎂\n\nOlá ${c.name.split(' ')[0]}! Preparamos opções especiais no nosso cardápio de bolos artesanais e biscoitos decorados.\n\nVenha conferir nosso catálogo atualizado e monte seu orçamento online:\nhttps://confeitaria-cinthia.vercel.app/\n\nEstamos à disposição para deixar sua festa deliciosa! 💕`;
    window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão de Clientes & CRM (LGPD)
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Histórico de compras, datas de aniversário, disparo de promoções e proteção de dados
            </p>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F2D7D0] bg-white text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-[#C27360] text-white shadow-sm'
                  : 'bg-white text-[#4A3531] border border-[#F2D7D0]'
              }`}
            >
              Todos os Clientes ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('birthdays')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'birthdays'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-rose-700 border border-rose-200'
              }`}
            >
              <Cake className="w-4 h-4" /> Aniversariantes do Mês (
              {customers.filter((c) => isBirthdayThisMonth(c.birthDate)).length})
            </button>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando base de clientes...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] overflow-hidden shadow-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FDF7F6] border-b border-[#F2D7D0] text-[11px] uppercase tracking-wider font-bold text-[#A75644]">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Contato / E-mail</th>
                  <th className="p-4">Aniversário</th>
                  <th className="p-4">Pedidos / Total Gasto</th>
                  <th className="p-4">LGPD</th>
                  <th className="p-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2D7D0]/60 text-xs text-[#4A3531]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF6F4]">
                    <td className="p-4">
                      <div className="font-bold text-[#4A231A] text-sm">{c.name}</div>
                      <span className="text-[10px] text-gray-500">Cadastrado em {formatDate(c.createdAt)}</span>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <a
                        href={`https://wa.me/${c.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 font-medium hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> {c.whatsapp}
                      </a>
                      {c.email && (
                        <span className="text-gray-500 flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-gray-400" /> {c.email}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.birthDate ? (
                        <span
                          className={`font-semibold px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1 ${
                            isBirthdayThisMonth(c.birthDate)
                              ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Cake className="w-3 h-3" /> {formatDate(c.birthDate).slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Não informado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-[#4A231A]">{c.ordersCount || 0} pedido(s)</div>
                      <div className="font-extrabold text-[#C27360] font-serif">
                        {formatCurrency(c.totalSpent || 0)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> LGPD Ok
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      {isBirthdayThisMonth(c.birthDate) && (
                        <button
                          onClick={() => sendBirthdayWish(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm inline-flex items-center gap-1"
                        >
                          <Gift className="w-3.5 h-3.5" /> Enviar Parabéns
                        </button>
                      )}
                      <button
                        onClick={() => sendPromoMsg(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm inline-flex items-center gap-1"
                      >
                        <Tag className="w-3.5 h-3.5" /> Promoção
                      </button>
                      <button
                        onClick={() => handleOpenCustomerDetail(c.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] font-bold hover:bg-[#FAF6F4]"
                      >
                        Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Customer Detail History Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <div>
                  <h3 className="font-serif font-bold text-xl text-[#4A231A]">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#645451]">
                    WhatsApp: {selectedCustomer.whatsapp} {selectedCustomer.email && `| E-mail: ${selectedCustomer.email}`}
                  </p>
                </div>
                <button onClick={() => setSelectedCustomer(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Info Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#FDF7F6] border border-[#F2D7D0]">
                  <span className="text-[10px] uppercase font-bold text-[#A75644]">Data de Nascimento</span>
                  <p className="text-sm font-bold font-serif text-[#4A231A] mt-0.5">
                    {selectedCustomer.birthDate ? formatDate(selectedCustomer.birthDate) : 'Não informada'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#FDF7F6] border border-[#F2D7D0]">
                  <span className="text-[10px] uppercase font-bold text-[#A75644]">Total Gasto</span>
                  <p className="text-sm font-bold font-serif text-[#C27360] mt-0.5">
                    {formatCurrency(selectedCustomer.totalSpent || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Conformidade LGPD</span>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Aceite Registrado
                  </p>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#A75644] uppercase">Histórico de Pedidos & Orçamentos:</h4>
                {selectedCustomer.orders?.length > 0 ? (
                  selectedCustomer.orders.map((o: any) => (
                    <div key={o.id} className="p-3 rounded-xl border border-[#F2D7D0] bg-[#FAF6F4] flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#4A231A]">{o.orderNumber}</span>
                        <p className="text-[11px] text-gray-600">Data: {formatDate(o.deliveryDate)} | Status: {o.status}</p>
                      </div>
                      <span className="font-bold text-[#C27360] font-serif">{formatCurrency(o.totalAmount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">Nenhum pedido finalizado ainda.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
