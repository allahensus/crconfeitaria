'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDate, formatWhatsappForUrl } from '@/lib/utils';
import { daysUntilNextBirthday, isBirthdayWithinDays } from '@/lib/birthdays';
import { Users, Search, MessageCircle, Cake, Mail, ShieldCheck, Gift, Tag, X, Send, Sparkles, Edit2, Trash2, Check } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'birthdays'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Edit customer state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Promo modal state
  const [promoCustomer, setPromoCustomer] = useState<any>(null);
  const [promoType, setPromoType] = useState<'birthday' | 'catalog' | 'discount' | 'custom'>('catalog');
  const [promoText, setPromoText] = useState('');

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
      if (data) {
        setSelectedCustomer(data);
        setIsEditingCustomer(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = () => {
    if (!selectedCustomer) return;
    setEditName(selectedCustomer.name || '');
    setEditWhatsapp(selectedCustomer.whatsapp || '');
    setEditEmail(selectedCustomer.email || '');
    setEditCpf(selectedCustomer.cpf || '');
    setEditAddress(selectedCustomer.address || '');
    setEditBirthDate(selectedCustomer.birthDate ? selectedCustomer.birthDate.slice(0, 10) : '');
    setEditNotes(selectedCustomer.notes || '');
    setEditErrorMsg('');
    setIsEditingCustomer(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setEditErrorMsg('');
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          whatsapp: editWhatsapp,
          email: editEmail || null,
          cpf: editCpf || null,
          address: editAddress || null,
          birthDate: editBirthDate || null,
          notes: editNotes || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditingCustomer(false);
        setSelectedCustomer({ ...selectedCustomer, ...data });
        loadCustomers();
      } else {
        setEditErrorMsg(data.error || 'Erro ao salvar cliente.');
      }
    } catch (err) {
      console.error(err);
      setEditErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (
      !confirm(
        `Excluir "${selectedCustomer.name}" definitivamente? Os dados pessoais (nome, WhatsApp, e-mail, CPF, endereço) serão apagados. Os pedidos e valores já registrados são mantidos no histórico financeiro, apenas desvinculados deste cliente. Essa ação não pode ser desfeita.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedCustomer(null);
        loadCustomers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir cliente.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar ao servidor.');
    }
  };

  const BIRTHDAY_WINDOW_DAYS = 30;

  // "Coming up in the next 30 days", not "same calendar month" -- a same-month
  // check misses a birthday landing right after the month rolls over, and
  // keeps flagging one from days ago as if it still needed action.
  const isBirthdayUpcoming = (birthDateStr?: string) => {
    if (!birthDateStr) return false;
    const d = new Date(birthDateStr);
    return !isNaN(d.getTime()) && isBirthdayWithinDays(d, BIRTHDAY_WINDOW_DAYS);
  };

  const filtered = customers
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterType === 'birthdays') {
        return matchesSearch && isBirthdayUpcoming(c.birthDate);
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (filterType !== 'birthdays') return 0;
      return daysUntilNextBirthday(new Date(a.birthDate)) - daysUntilNextBirthday(new Date(b.birthDate));
    });

  const generatePromoTemplate = (type: 'birthday' | 'catalog' | 'discount' | 'custom', customerName: string) => {
    const firstName = customerName ? customerName.split(' ')[0] : 'Cliente';
    if (type === 'birthday') {
      return `🎉 *FELIZ ANIVERSÁRIO, ${firstName.toUpperCase()}!* 🎂🎈\n\nA Confeitaria Cinthia Rodrigues deseja a você um dia repleto de doçura, amor e momentos inesquecíveis!\n\nComo nosso presente especial de aniversário, preparamos um *cupom de 10% DE DESCONTO* na sua próxima encomenda de bolo ou biscoitos! 💕\n\nCupom: *NIVER10*\n\nQuer encomendar o seu bolo de aniversário com o desconto? É só responder essa mensagem! ✨`;
    }
    if (type === 'catalog') {
      return `✨ *NOVIDADES EXCLUSIVAS DA CONFEITARIA CINTHIA RODRIGUES!* 🎂\n\nOlá ${firstName}! Preparamos opções especiais no nosso cardápio de bolos artesanais e biscoitos decorados.\n\nVenha conferir nosso catálogo atualizado e monte seu orçamento online:\nhttps://confeitaria-cinthia.vercel.app/\n\nEstamos à disposição para deixar sua festa deliciosa! 💕`;
    }
    if (type === 'discount') {
      return `🍰 *OFERTA ESPECIAL PARA VOCÊ, ${firstName.toUpperCase()}!* ✨\n\nOlá! Estamos com um desconto exclusivo de *15% OFF* para pedidos realizados esta semana na Confeitaria Cinthia Rodrigues.\n\nAproveite para garantir seu bolo personalizado ou biscoitos amanteigados com desconto!\n\nPara aproveitar, basta responder essa mensagem com o seu pedido! 💕`;
    }
    return `Olá ${firstName}! Tudo bem?\n\nPassando para mandar um carinho da Confeitaria Cinthia Rodrigues! 💕`;
  };

  const handleOpenPromoModal = (c: any, defaultType: 'birthday' | 'catalog' | 'discount' | 'custom' = 'catalog') => {
    setPromoCustomer(c);
    setPromoType(defaultType);
    setPromoText(generatePromoTemplate(defaultType, c.name));
  };

  const handleSelectPromoType = (type: 'birthday' | 'catalog' | 'discount' | 'custom') => {
    setPromoType(type);
    if (promoCustomer) {
      setPromoText(generatePromoTemplate(type, promoCustomer.name));
    }
  };

  const handleSendWhatsAppPromo = () => {
    if (!promoCustomer) return;
    const cleanPhone = formatWhatsappForUrl(promoCustomer.whatsapp);
    if (!cleanPhone) {
      alert('Número de WhatsApp inválido.');
      return;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(promoText)}`, '_blank');
    setPromoCustomer(null);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
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
              <Cake className="w-4 h-4" /> Aniversariantes (30 dias) (
              {customers.filter((c) => isBirthdayUpcoming(c.birthDate)).length})
            </button>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando base de clientes...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] overflow-hidden shadow-card">
            <div className="overflow-x-auto">
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
                        href={`https://wa.me/${formatWhatsappForUrl(c.whatsapp)}`}
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
                            isBirthdayUpcoming(c.birthDate)
                              ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                          title={
                            isBirthdayUpcoming(c.birthDate)
                              ? `Faltam ${daysUntilNextBirthday(new Date(c.birthDate))} dia(s)`
                              : undefined
                          }
                        >
                          <Cake className="w-3 h-3" /> {formatDate(c.birthDate).slice(0, 5)}
                          {isBirthdayUpcoming(c.birthDate) && (
                            <span className="ml-0.5">
                              · {daysUntilNextBirthday(new Date(c.birthDate)) === 0
                                ? 'Hoje!'
                                : `${daysUntilNextBirthday(new Date(c.birthDate))}d`}
                            </span>
                          )}
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
                      {isBirthdayUpcoming(c.birthDate) && (
                        <button
                          onClick={() => handleOpenPromoModal(c, 'birthday')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm inline-flex items-center gap-1"
                        >
                          <Gift className="w-3.5 h-3.5" /> Enviar Parabéns
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenPromoModal(c, 'catalog')}
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
          </div>
        )}

        {/* Promo Dispatch Modal */}
        {promoCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#C27360] text-white flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#4A231A]">Disparar Promoção no WhatsApp</h3>
                    <p className="text-xs text-[#645451]">Para: {promoCustomer.name} (+{formatWhatsappForUrl(promoCustomer.whatsapp)})</p>
                  </div>
                </div>
                <button onClick={() => setPromoCustomer(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preset Model Selectors */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-2">
                  Escolha um Modelo de Mensagem:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'catalog', label: '📖 Novidades Cardápio' },
                    { id: 'birthday', label: '🎂 Cupom Aniversário' },
                    { id: 'discount', label: '🏷️ Oferta Especial 15%' },
                    { id: 'custom', label: '✍️ Mensagem Livre' },
                  ].map((typeItem) => (
                    <button
                      key={typeItem.id}
                      type="button"
                      onClick={() => handleSelectPromoType(typeItem.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        promoType === typeItem.id
                          ? 'border-[#C27360] bg-[#FDF7F6] text-[#4A231A] ring-2 ring-[#C27360]/30 shadow-sm'
                          : 'border-[#F2D7D0] bg-white text-[#4A3531] hover:bg-[#FAF6F4]'
                      }`}
                    >
                      {typeItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Text Area (Editable) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1.5 flex items-center justify-between">
                  <span>Texto da Mensagem (Editável)</span>
                  <span className="text-[10px] text-[#C27360] font-semibold">Altere como desejar antes de enviar</span>
                </label>
                <textarea
                  rows={7}
                  value={promoText}
                  onChange={(e) => setPromoText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] bg-[#FAF6F4] text-xs text-[#4A231A] font-sans focus:ring-2 focus:ring-[#C27360] outline-none leading-relaxed"
                  placeholder="Escreva aqui a promoção ou mensagem..."
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPromoCustomer(null)}
                  className="flex-1 py-3 rounded-xl border border-[#F2D7D0] text-[#4A231A] font-bold text-xs hover:bg-[#FAF6F4]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppPromo}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar via WhatsApp
                </button>
              </div>

            </div>
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
                <div className="flex items-center gap-2">
                  {!isEditingCustomer && (
                    <>
                      <button
                        onClick={handleStartEdit}
                        className="p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FAF6F4]"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4 text-[#C27360]" />
                      </button>
                      <button
                        onClick={handleDeleteCustomer}
                        className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button onClick={() => setSelectedCustomer(null)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {isEditingCustomer ? (
                <form onSubmit={handleSaveCustomer} className="space-y-3">
                  {editErrorMsg && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                      {editErrorMsg}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Nome *</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">WhatsApp *</label>
                      <input
                        type="text"
                        required
                        value={editWhatsapp}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">E-mail</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">CPF</label>
                      <input
                        type="text"
                        value={editCpf}
                        onChange={(e) => setEditCpf(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Endereço</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Observações</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360] resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingCustomer(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2D7D0] text-[#4A231A] font-bold text-xs hover:bg-[#FAF6F4]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-xs shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <>
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
                </>
              )}

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
