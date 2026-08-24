'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/public/Navbar';
import { Hero } from '@/components/public/Hero';
import { CategoryFilter } from '@/components/public/CategoryFilter';
import { ProductCard } from '@/components/public/ProductCard';
import { BudgetCalculatorModal } from '@/components/public/BudgetCalculatorModal';
import { Testimonials } from '@/components/public/Testimonials';
import { ContactFooter } from '@/components/public/ContactFooter';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { Sparkles, Cake, Star, Heart, CheckCircle2 } from 'lucide-react';

export default function PublicPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fillings, setFillings] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
  const [selectedVariationForModal, setSelectedVariationForModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes, fillRes, testRes, setRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/fillings'),
          fetch('/api/testimonials'),
          fetch('/api/settings'),
        ]);

        const [prods, cats, fills, tests, sets] = await Promise.all([
          prodRes.json(),
          catRes.json(),
          fillRes.json(),
          testRes.json(),
          setRes.json(),
        ]);

        if (Array.isArray(prods)) setProducts(prods);
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(fills)) setFillings(fills);
        if (Array.isArray(tests)) setTestimonials(tests);
        if (typeof sets === 'object' && sets !== null) setSettings(sets);
      } catch (err) {
        console.error('Error loading public storefront data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOpenModal = (product?: any, variation?: any) => {
    setSelectedProductForModal(product || null);
    setSelectedVariationForModal(variation || null);
    setIsModalOpen(true);
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(
        (p) =>
          p.category?.slug === selectedCategory ||
          p.category?.id === selectedCategory ||
          p.categoryId === selectedCategory
      );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F4]">
      {/* Navbar */}
      <Navbar
        onOpenBudgetModal={() => handleOpenModal()}
        whatsappNumber={settings.whatsapp_number}
      />

      {/* Hero Banner */}
      <Hero onOpenBudgetModal={() => handleOpenModal()} />

      {/* Catalog Showcase Section */}
      <section id="catalogo" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-widest text-[#C27360] font-bold">
            Delícias Feitas à Mão
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#4A231A]">
            Nosso Catálogo Especial
          </h2>
          <p className="text-sm text-[#645451]">
            Selecione uma categoria abaixo e monte seu orçamento personalizado em poucos cliques.
          </p>
        </div>

        {/* Categories Filter */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenBudgetModal={(p, v) => handleOpenModal(p, v)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#F2D7D0] p-8">
            <p className="text-[#645451] font-medium">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </section>

      {/* 20 Fillings Menu Section */}
      <section id="sabores" className="py-16 bg-gradient-to-b from-[#FDF7F6] to-[#FAF6F4] border-y border-[#F2D7D0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-widest text-[#C27360] font-bold">
              Qualidade Incomparável
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#4A231A] mt-2">
              Cardápio de Recheios Especiais
            </h2>
            <p className="text-sm text-[#645451] mt-2">
              Trabalhamos com os melhores recheios artesanais cremosos e nobres para o seu bolo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {fillings.map((f) => (
              <div
                key={f.id}
                className="bg-white p-4 rounded-2xl border border-[#F2D7D0] shadow-sm hover:border-[#C27360] hover:shadow-md transition-all flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-[#F9ECE9] text-[#C27360] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-[#C27360]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#4A231A]">{f.name}</h4>
                  <span className="text-[10px] text-[#A75644] font-medium uppercase">{f.category}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Warm & Professional Transparency Note */}
          <div className="mt-8 max-w-2xl mx-auto p-4 bg-white rounded-2xl border border-[#F2D7D0] shadow-sm text-center space-y-1">
            <h4 className="text-xs uppercase font-bold text-[#A75644] tracking-wider">
              ✨ Transparência & Carinho com Nossos Clientes
            </h4>
            <p className="text-xs text-[#645451] leading-relaxed">
              Os preços apresentados no catálogo referem-se à nossa base artesanal clássica. Recheios especiais que levam <strong>frutas frescas (morango, abacaxi), nozes praliné, bombons finos ou Nutella pura</strong> passam por um pequeno ajuste de valor para garantirmos ingredientes frescos e a máxima qualidade no seu evento! 💕
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => handleOpenModal()}
              className="px-8 py-3 rounded-full bg-[#C27360] text-white font-bold text-sm shadow-blush hover:bg-[#A75644] transition-all"
            >
              Montar Bolo com Seu Recheio Favorito
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials testimonials={testimonials} />

      {/* Footer */}
      <ContactFooter settings={settings} />

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton whatsappNumber={settings.whatsapp_number} />

      {/* Interactive Budget Calculator Modal */}
      <BudgetCalculatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialProduct={selectedProductForModal}
        initialVariation={selectedVariationForModal}
        products={products}
        fillings={fillings}
        whatsappNumber={settings.whatsapp_number}
      />
    </div>
  );
}
