'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { FolderTree, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
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
    setDescription('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();
      if (res.ok) {
        setName('');
        setDescription('');
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao salvar categoria.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar ao servidor.');
    }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${c.name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        loadData();
      } else {
        alert(data.error || 'Erro ao excluir categoria.');
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
              Categorias de Produtos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Organize o catálogo em categorias dinâmicas (Bolos, Biscoitos, Kits, etc.)
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-xs shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando categorias...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white p-6 rounded-2xl border border-[#F2D7D0] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#F9ECE9] text-[#C27360] font-bold flex items-center justify-center text-sm">
                      📁
                    </span>
                    <span className="text-xs font-bold text-[#A75644] bg-[#FAF6F4] px-2.5 py-1 rounded-full border border-[#F2D7D0]">
                      {c._count?.products || 0} Produtos
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-[#4A231A]">{c.name}</h3>
                  <p className="text-xs text-[#645451] mt-1">{c.description || 'Sem descrição'}</p>
                </div>

                <div className="pt-4 border-t border-[#F2D7D0] mt-4 flex items-center justify-between text-xs text-[#645451]">
                  <span>Slug: /{c.slug}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6]"
                      title="Editar categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C27360]" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                      title="Excluir categoria"
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
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#F2D7D0] shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">
                  {editingId ? 'Editar Categoria' : 'Nova Categoria'}
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
                    Nome da Categoria *
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
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360] resize-none"
                  />
                </div>

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
                    {editingId ? 'Salvar Alterações' : 'Criar Categoria'}
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
