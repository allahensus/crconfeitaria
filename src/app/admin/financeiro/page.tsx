'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Plus, CreditCard, Calendar, Filter, X, Edit2, Trash2 } from 'lucide-react';

export default function AdminFinancePage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Expense form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Ingredientes');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [errorMsg, setErrorMsg] = useState('');

  const loadFinance = async () => {
    try {
      const res = await fetch(`/api/finance?range=${range}`);
      const json = await res.json();
      if (json) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [range]);

  const handleOpenCreateExpense = () => {
    setEditingId(null);
    setDescription('');
    setCategory('Ingredientes');
    setAmount('');
    setPaymentMethod('Pix');
    setErrorMsg('');
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (t: any) => {
    setEditingId(t.id);
    setDescription(t.description);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setPaymentMethod(t.expense?.paymentMethod || 'Pix');
    setErrorMsg('');
    setIsExpenseModalOpen(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const url = editingId ? `/api/finance/${editingId}` : '/api/finance';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DESPESA',
          description,
          category,
          amount: parseFloat(amount),
          paymentMethod,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setIsExpenseModalOpen(false);
        setDescription('');
        setAmount('');
        loadFinance();
      } else {
        setErrorMsg(json.error || 'Erro ao salvar lançamento.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDeleteExpense = async (t: any) => {
    if (!confirm(`Excluir o lançamento "${t.description}"?`)) return;
    try {
      const res = await fetch(`/api/finance/${t.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        loadFinance();
      } else {
        alert(json.error || 'Erro ao excluir lançamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar ao servidor.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão Financeira & DRE
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Controle completo de receitas de vendas, despesas operacionais e margem de lucro
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateExpense}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs shadow hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Despesa
            </button>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-[#4A231A]">Período:</span>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mês' },
            { id: 'year', label: 'Este Ano' },
            { id: 'all', label: 'Todo o Histórico' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                range === r.id
                  ? 'bg-[#C27360] text-white shadow-sm'
                  : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Financial Metrics Cards */}
        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando balanço financeiro...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Total Receita Entrada
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-emerald-600 mt-1">
                    {formatCurrency(data?.metrics?.totalRevenue || 0)}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">Vendas e sinais recebidos</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
                    Total Despesas Saída
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-red-600 mt-1">
                    {formatCurrency(data?.metrics?.totalExpenses || 0)}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">Ingredientes & Embalagens</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#F2D7D0] shadow-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#4A231A] uppercase tracking-wider">
                    Lucro Líquido
                  </span>
                  <h3 className="text-2xl font-bold font-serif text-[#C27360] mt-1">
                    {formatCurrency(data?.metrics?.netProfit || 0)}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">Resultado final consolidado</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#F9ECE9] text-[#C27360] flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-3xl border border-[#F2D7D0] p-6 shadow-card space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#4A231A]">Extrato de Lançamentos</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FDF7F6] border-b border-[#F2D7D0] text-[11px] uppercase tracking-wider font-bold text-[#A75644]">
                      <th className="p-3">Data</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3 text-right">Valor</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2D7D0]/60 text-[#4A3531]">
                    {data?.transactions?.map((t: any) => {
                      const isEditable = t.type === 'DESPESA' && !!t.expenseId;
                      return (
                        <tr key={t.id} className="hover:bg-[#FAF6F4]">
                          <td className="p-3 font-medium">{formatDate(t.date)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.type === 'RECEITA' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{t.category}</td>
                          <td className="p-3">{t.description}</td>
                          <td
                            className={`p-3 text-right font-extrabold font-serif ${
                              t.type === 'RECEITA' ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {t.type === 'RECEITA' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                          <td className="p-3 text-right">
                            {isEditable ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditExpense(t)}
                                  className="p-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FAF6F4]"
                                  title="Editar lançamento"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#C27360]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(t)}
                                  className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                                  title="Excluir lançamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                {t.orderId ? 'Gerado por pedido' : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Expense Modal */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">
                  {editingId ? 'Editar Despesa' : 'Registrar Nova Despesa'}
                </h3>
                <button onClick={() => setIsExpenseModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                  {errorMsg}
                </p>
              )}

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Descrição da Despesa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Compra de leites condensados e caixas"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Categoria da Despesa *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  >
                    <option value="Ingredientes">Ingredientes</option>
                    <option value="Embalagens">Embalagens</option>
                    <option value="Entregas">Entregas & Frete</option>
                    <option value="Energia">Energia / Água / Gás</option>
                    <option value="Equipamentos">Equipamentos & Utensílios</option>
                    <option value="Marketing">Marketing & Anúncios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Valor R$ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 85.50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow"
                  >
                    {editingId ? 'Salvar Alterações' : 'Lançar Despesa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
