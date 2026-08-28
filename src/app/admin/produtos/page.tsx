'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import { Cake, Plus, Edit2, Trash2, Star, Check, X, Search, Layers, Image as ImageIcon } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [mainImage, setMainImage] = useState('/images/bento_cake.jpg');
  const [basePrice, setBasePrice] = useState('');
  const [yieldInfo, setYieldInfo] = useState('');
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Variations form array
  const [variations, setVariations] = useState<{ name: string; price: string; slices?: string }[]>([
    { name: 'Padrão', price: '95' },
  ]);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products?active=all'),
        fetch('/api/categories'),
      ]);
      const prods = await prodRes.json();
      const cats = await catRes.json();
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(cats)) {
        setCategories(cats);
        if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg('Enviando imagem do computador...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setMainImage(data.url);
        setUploadMsg('✅ Imagem salva com sucesso!');
        setTimeout(() => setUploadMsg(''), 4000);
      } else {
        setUploadMsg(`⚠️ ${data.error || 'Erro ao enviar imagem'}`);
      }
    } catch (err: any) {
      setUploadMsg('⚠️ Erro ao conectar ao servidor de imagens.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setMainImage('/images/bento_cake.jpg');
    setBasePrice('95');
    setYieldInfo('');
    setFeatured(false);
    setActive(true);
    setVariations([{ name: 'Padrão', price: '95' }]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setCategoryId(p.categoryId);
    setDescription(p.description);
    setMainImage(p.mainImage);
    setBasePrice(p.basePrice.toString());
    setYieldInfo(p.yieldInfo || '');
    setFeatured(p.featured);
    setActive(p.active);
    setVariations(
      p.variations && p.variations.length > 0
        ? p.variations.map((v: any) => ({ name: v.name, price: v.price.toString(), slices: v.slices || '' }))
        : [{ name: 'Padrão', price: p.basePrice.toString() }]
    );
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        categoryId,
        description,
        mainImage,
        basePrice: parseFloat(basePrice),
        yieldInfo,
        featured,
        active,
        variations: variations.map((v) => ({
          name: v.name,
          price: parseFloat(v.price),
          slices: v.slices || null,
        })),
      };

      const url = editingId ? `/api/products/${editingId}` : '/api/products';
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
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A]">
              Gestão de Produtos
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Cadastre, edite e controle variações de preços e fotos da confeitaria
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F2D7D0] bg-white text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
          />
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-8 text-center text-[#645451]">Carregando produtos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-[#F2D7D0] overflow-hidden shadow-card hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <img
                      src={p.mainImage}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {p.featured && (
                        <span className="bg-[#C27360] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-current" /> Destaque
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-[#C27360] tracking-widest block">
                      {p.category?.name || 'Bolos'}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#4A231A] leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-[#645451] line-clamp-2">{p.description}</p>

                    {p.variations && p.variations.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-[#A75644] block mb-1">
                          Variações & Tamanhos:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {p.variations.map((v: any) => (
                            <span
                              key={v.id || v.name}
                              className="text-[10px] bg-[#FAF6F4] text-[#874132] px-2 py-0.5 rounded border border-[#F2D7D0]"
                            >
                              {v.name}: {formatCurrency(v.price)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-[#F2D7D0]/60 flex items-center justify-between bg-gray-50">
                  <div>
                    {p.variations && p.variations.length > 0 && (
                      <span className="text-[9px] uppercase font-bold text-[#A75644] block">
                        A partir de
                      </span>
                    )}
                    <span className="font-bold text-base text-[#4A231A] font-serif">
                      {formatCurrency(
                        p.variations && p.variations.length > 0
                          ? Math.min(...p.variations.map((v: any) => v.price))
                          : p.basePrice
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6]"
                    >
                      <Edit2 className="w-4 h-4 text-[#C27360]" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-[#F2D7D0] shadow-2xl my-8 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">
                  {editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Nome do Produto *
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
                    Categoria *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Descrição Detalhada *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Preço Base (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Rendimento / Fatias
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 7 fatias"
                      value={yieldInfo}
                      onChange={(e) => setYieldInfo(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                  </div>
                </div>

                {/* Image Upload & Path Section */}
                <div className="space-y-3 p-4 rounded-2xl bg-[#FAF6F4] border border-[#F2D7D0]">
                  <label className="block text-xs font-bold uppercase text-[#A75644]">
                    Foto do Produto *
                  </label>

                  {/* File Upload Selector */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="file-upload-input"
                      className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Escolher Foto do Computador
                    </label>
                    <input
                      id="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-xs text-gray-500">ou cole a URL de uma imagem</span>
                  </div>

                  {/* Image URL Input */}
                  <input
                    type="text"
                    placeholder="Ex: https://exemplo.com/foto.jpeg"
                    value={mainImage}
                    onChange={(e) => setMainImage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] bg-white text-xs outline-none focus:ring-2 focus:ring-[#C27360]"
                  />

                  {uploadMsg && (
                    <p className="text-xs font-semibold text-[#C27360]">{uploadMsg}</p>
                  )}

                  {/* Live Image Preview */}
                  {mainImage && (
                    <div className="flex items-center gap-3 pt-2 p-3 bg-white rounded-xl border border-[#F2D7D0]">
                      <div className="relative w-20 h-20 rounded-xl border border-[#E6B9AE] overflow-hidden bg-gray-50 shadow-sm flex items-center justify-center shrink-0">
                        <img
                          key={mainImage}
                          src={mainImage}
                          alt="Pré-visualização do produto"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image load error for:', mainImage);
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-gray-600 space-y-1 overflow-hidden">
                        <span className="font-bold text-[#4A231A] block">Caminho / URL da Imagem:</span>
                        <code className="text-[11px] bg-[#FAF6F4] px-2 py-1 rounded border border-[#F2D7D0] text-[#874132] font-mono block truncate max-w-xs">
                          {mainImage}
                        </code>
                        <a
                          href={mainImage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#C27360] font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          🔗 Ver imagem completa em nova aba
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Variations Input */}
                <div className="p-4 bg-[#FAF6F4] rounded-2xl border border-[#F2D7D0] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-[#A75644]">
                      Variações de Tamanhos e Preços
                    </span>
                    <button
                      type="button"
                      onClick={() => setVariations([...variations, { name: '', price: '0' }])}
                      className="text-xs text-[#C27360] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Variação
                    </button>
                  </div>

                  {variations.map((v, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome (ex: 13 a 15 fatias)"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variations];
                          updated[index].name = e.target.value;
                          setVariations(updated);
                        }}
                        className="flex-1 p-2 rounded-lg border border-[#F2D7D0] text-xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Preço R$"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variations];
                          updated[index].price = e.target.value;
                          setVariations(updated);
                        }}
                        className="w-24 p-2 rounded-lg border border-[#F2D7D0] text-xs"
                      />
                      {variations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setVariations(variations.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4A231A]">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C27360]"
                    />
                    Produto em Destaque
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#4A231A]">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C27360]"
                    />
                    Produto Ativo no Site
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#F2D7D0]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#C27360] text-white text-xs font-bold shadow-md hover:bg-[#A75644]"
                  >
                    Salvar Produto
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
