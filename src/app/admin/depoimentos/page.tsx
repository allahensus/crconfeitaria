'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Quote, Plus, Edit2, Trash2, Star, X, Check } from 'lucide-react';

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [active, setActive] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/testimonials?active=all');
      const data = await res.json();
      if (Array.isArray(data)) setTestimonials(data);
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
    setEventType('');
    setComment('');
    setRating(5);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingId(t.id);
    setName(t.name);
    setEventType(t.eventType);
    setComment(t.comment);
    setRating(t.rating);
    setActive(t.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, eventType, comment, rating, active };
      const url = editingId ? `/api/testimonials/${editingId}` : '/api/testimonials';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este depoimento?')) {
      await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Depoimentos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Avaliações reais de clientes exibidas na vitrine pública
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Depoimento
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando depoimentos...</div>
        ) : testimonials.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-10 text-center shadow-card max-w-2xl">
            <Quote className="w-8 h-8 text-[#F2D7D0] mx-auto mb-3" />
            <p className="text-sm text-[#645451]">
              Nenhum depoimento cadastrado ainda. Assim que uma cliente elogiar seu trabalho no
              WhatsApp ou nas redes, adicione o depoimento aqui pra aparecer na vitrine.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-[#F2D7D0] p-5 shadow-card flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < t.rating ? 'fill-[#C27360] text-[#C27360]' : 'text-[#F2D7D0]'}`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {t.active ? 'Visível' : 'Oculto'}
                  </span>
                </div>

                <p className="text-sm text-[#4A3531] leading-relaxed flex-1">"{t.comment}"</p>

                <div>
                  <span className="font-bold text-sm text-[#4A231A] block">{t.name}</span>
                  <span className="text-xs text-[#874132]">{t.eventType}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F2D7D0]/60">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex-1 p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6] flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#C27360]" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#F2D7D0] flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="font-serif text-xl font-bold text-[#4A231A]">
                {editingId ? 'Editar Depoimento' : 'Novo Depoimento'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-[#FAF6F4] text-[#645451]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Nome da Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Tipo de Evento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário, Chá de Bebê, Casamento..."
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Depoimento *
                </label>
                <textarea
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Nota
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-6 h-6 ${i < rating ? 'fill-[#C27360] text-[#C27360]' : 'text-[#F2D7D0]'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-[#C27360]"
                />
                <span className="text-sm text-[#4A3531] font-medium">
                  Visível na vitrine pública
                </span>
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
