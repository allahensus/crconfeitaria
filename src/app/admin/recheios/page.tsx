'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import { Layers, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function AdminFillingsPage() {
  const [fillings, setFillings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [extraPrice, setExtraPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/fillings');
      const data = await res.json();
      if (Array.isArray(data)) setFillings(data);
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
    setName('');
    setCategory('');
    setExtraPrice('0');
    setDescription('');
    setActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: any) => {
    setEditingId(f.id);
    setName(f.name);
    setCategory(f.category || '');
    setExtraPrice(String(f.extraPrice ?? 0));
    setDescription(f.description || '');
    setActive(f.active);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const url = editingId ? `/api/fillings/${editingId}` : '/api/fillings';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, extraPrice, description, active }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar recheio.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (f: any) => {
    if (!confirm(`Tem certeza que deseja excluir o recheio "${f.name}"?`)) return;
    try {
      const res = await fetch(`/api/fillings/${f.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        loadData();
      } else {
        alert(data.error || 'Erro ao excluir recheio.');
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
              Recheios
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Cadastre os sabores disponíveis e o acréscimo de preço de cada um -- é o que o assistente virtual do site usa pra responder sobre sabores, sem inventar nada.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-xs shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Recheio
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando recheios...</div>
        ) : fillings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#F2D7D0] p-8">
            <p className="text-[#645451] font-medium">Nenhum recheio cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fillings.map((f) => (
              <div
                key={f.id}
                className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
                  f.active ? 'border-[#F2D7D0]' : 'border-gray-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#F9ECE9] text-[#C27360] flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </span>
                    {!f.active && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#4A231A]">{f.name}</h3>
                  <span className="text-[10px] text-[#A75644] font-medium uppercase">{f.category}</span>
                  {f.description && (
                    <p className="text-xs text-[#645451] mt-1.5">{f.description}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#F2D7D0] mt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A231A]">
                    {f.extraPrice > 0 ? `+ ${formatCurrency(f.extraPrice)}` : 'Sem acréscimo'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6]"
                      title="Editar recheio"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C27360]" />
                    </button>
                    <button
                      onClick={() => handleDelete(f)}
                      className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                      title="Excluir recheio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">
                  {editingId ? 'Editar Recheio' : 'Novo Recheio'}
                </h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                  {errorMsg}
                </p>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Nome do Recheio *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Clássicos, Frutas, Nobre..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Acréscimo de Preço (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={extraPrice}
                    onChange={(e) => setExtraPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Deixe 0 se esse recheio já está incluso no valor da tabela.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360] resize-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#4A231A]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-[#C27360] w-4 h-4"
                  />
                  Recheio ativo (aparece pros clientes e pro assistente virtual)
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#C27360] text-white text-xs font-bold shadow-md"
                  >
                    {editingId ? 'Salvar Alterações' : 'Criar Recheio'}
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
