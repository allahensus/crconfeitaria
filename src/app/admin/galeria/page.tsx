'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Images, Plus, Edit2, Trash2, X, Check, Upload } from 'lucide-react';

export default function AdminGalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [eventType, setEventType] = useState('');
  const [order, setOrder] = useState(0);
  const [active, setActive] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/gallery?active=all');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
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
    setImageUrl('');
    setCaption('');
    setEventType('');
    setOrder(0);
    setActive(true);
    setUploadMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setImageUrl(item.imageUrl);
    setCaption(item.caption || '');
    setEventType(item.eventType);
    setOrder(item.order);
    setActive(item.active);
    setUploadMsg('');
    setIsModalOpen(true);
  };

  const uploadOneFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return res.ok && data.url ? data.url : null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    // Batch mode: only when adding new photos (not editing an existing one)
    // and more than one file was picked. Each file becomes its own gallery
    // item, sharing whatever caption/tipo/ordem/visibilidade is already
    // filled in on the form -- fine to edit any of them individually after.
    if (!editingId && files.length > 1) {
      setUploading(true);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        setUploadMsg(`Enviando foto ${i + 1} de ${files.length}...`);
        const url = await uploadOneFile(files[i]);
        if (url) {
          const res = await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url, caption, eventType, order, active }),
          });
          if (res.ok) successCount++;
        }
      }
      setUploading(false);
      setUploadMsg(
        successCount === files.length
          ? `✅ ${successCount} fotos enviadas!`
          : `⚠️ ${successCount} de ${files.length} fotos enviadas.`
      );
      await loadData();
      setTimeout(() => setIsModalOpen(false), 1200);
      return;
    }

    setUploading(true);
    setUploadMsg('Enviando foto...');
    try {
      const url = await uploadOneFile(files[0]);
      if (url) {
        setImageUrl(url);
        setUploadMsg('✅ Foto enviada com sucesso!');
        setTimeout(() => setUploadMsg(''), 4000);
      } else {
        setUploadMsg('⚠️ Erro ao enviar foto');
      }
    } catch (err) {
      setUploadMsg('⚠️ Erro ao conectar ao servidor de imagens.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setUploadMsg('⚠️ Envie uma foto antes de salvar.');
      return;
    }
    try {
      const payload = { imageUrl, caption, eventType, order, active };
      const url = editingId ? `/api/gallery/${editingId}` : '/api/gallery';
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
    if (confirm('Tem certeza que deseja excluir esta foto da galeria?')) {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
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
              Galeria de Trabalhos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Fotos de bolos e doces já entregues, exibidas na vitrine pública em /galeria
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Foto
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando galeria...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#F2D7D0] p-10 text-center shadow-card max-w-2xl">
            <Images className="w-8 h-8 text-[#F2D7D0] mx-auto mb-3" />
            <p className="text-sm text-[#645451]">
              Nenhuma foto cadastrada ainda. Adicione fotos de bolos e doces já entregues pra
              mostrar seu trabalho na vitrine pública.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card overflow-hidden flex flex-col"
              >
                <div className="relative w-full aspect-square bg-[#FDF7F6]">
                  <Image src={item.imageUrl} alt={item.caption || item.eventType} fill className="object-cover" />
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {item.active ? 'Visível' : 'Oculto'}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#874132]">
                    {item.eventType}
                  </span>
                  {item.caption && (
                    <p className="text-sm text-[#4A3531] leading-relaxed flex-1">{item.caption}</p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-[#F2D7D0]/60 mt-auto">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="flex-1 p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6] flex items-center justify-center gap-1.5 text-xs font-semibold"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#C27360]" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                {editingId ? 'Editar Foto' : 'Nova Foto'}
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
                  Foto *
                </label>
                {imageUrl && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-2 bg-[#FDF7F6]">
                    <Image src={imageUrl} alt="Pré-visualização" fill className="object-cover" />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-[#F2D7D0] text-sm text-[#874132] cursor-pointer hover:bg-[#FDF7F6] transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading
                    ? 'Enviando...'
                    : imageUrl
                      ? 'Trocar foto'
                      : editingId
                        ? 'Enviar foto do computador'
                        : 'Enviar fotos do computador (pode selecionar várias)'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple={!editingId}
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {!editingId && (
                  <p className="text-[11px] text-[#645451] mt-1">
                    Selecionando mais de uma foto, cada uma vira um item da galeria com a legenda e tipo de evento preenchidos abaixo.
                  </p>
                )}
                {uploadMsg && <p className="text-xs mt-1 text-[#874132]">{uploadMsg}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Tipo de Evento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário, Casamento, Chá de Bebê..."
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Legenda
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Bolo de 2 andares para casamento no jardim"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  className="w-full p-3 rounded-xl border border-[#F2D7D0] text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
                />
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
                  disabled={uploading}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-bold text-sm shadow-blush hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
