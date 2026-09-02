'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('10');
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [oncePerCustomer, setOncePerCustomer] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (Array.isArray(data)) setCoupons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode('');
    setDiscountType('PERCENT');
    setDiscountValue('10');
    setActive(true);
    setExpiresAt('');
    setMaxUses('');
    setOncePerCustomer(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue.toString());
    setActive(c.active);
    setExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : '');
    setMaxUses(c.maxUses !== null && c.maxUses !== undefined ? c.maxUses.toString() : '');
    setOncePerCustomer(c.oncePerCustomer !== undefined ? c.oncePerCustomer : true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        code,
        discountType,
        discountValue,
        active,
        expiresAt: expiresAt || null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        oncePerCustomer,
      };
      const url = editingId ? `/api/coupons/${editingId}` : '/api/coupons';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar cupom.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`Excluir o cupom "${c.code}"?`)) return;
    await fetch(`/api/coupons/${c.id}`, { method: 'DELETE' });
    loadData();
  };

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">Cupons de Desconto</h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Crie códigos que o cliente pode aplicar direto no orçamento do site
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Cupom
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando cupons...</div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-10 text-center shadow-card max-w-2xl">
            <Tag className="w-8 h-8 text-[#F2D7D0] mx-auto mb-3" />
            <p className="text-sm text-[#645451]">
              Nenhum cupom cadastrado ainda. Crie um código como "NIVER10" pra usar nas promoções de aniversário
              dos clientes.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6F4] uppercase text-[10px] tracking-wider text-[#A75644] font-bold border-b border-[#F2D7D0]">
                <tr>
                  <th className="p-4">Código</th>
                  <th className="p-4">Desconto</th>
                  <th className="p-4">Validade</th>
                  <th className="p-4">Usos</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2D7D0]/60 text-[#4A3531]">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF6F4]">
                    <td className="p-4 font-mono font-bold text-[#4A231A]">{c.code}</td>
                    <td className="p-4 font-bold text-emerald-700">
                      {c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                    </td>
                    <td className="p-4">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : 'Sem prazo'}
                    </td>
                    <td className="p-4">
                      {c.usageCount}{c.maxUses ? ` / ${c.maxUses}` : ''}x
                      {c.oncePerCustomer && (
                        <span className="block text-[9px] text-gray-500">1x por cliente</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6]"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#C27360]" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-[#F2D7D0] flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#4A231A]">
                {editingId ? 'Editar Cupom' : 'Novo Cupom'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-[#FAF6F4] text-[#645451]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                  {errorMsg}
                </p>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Código do Cupom *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NIVER10"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm font-mono uppercase text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Tipo
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  >
                    <option value="PERCENT">% Percentual</option>
                    <option value="FIXED">R$ Valor Fixo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Validade (opcional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                    Limite de Usos
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Sem limite"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={oncePerCustomer}
                  onChange={(e) => setOncePerCustomer(e.target.checked)}
                  className="w-4 h-4 accent-[#C27360]"
                />
                <span className="text-sm text-[#4A3531] font-medium">
                  Cada cliente só pode usar este cupom uma vez (pelo WhatsApp)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-[#C27360]"
                />
                <span className="text-sm text-[#4A3531] font-medium">Cupom ativo</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-[#F2D7D0] text-[#4A231A] font-bold text-sm hover:bg-[#FAF6F4] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
