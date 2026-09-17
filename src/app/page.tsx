'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/public/Navbar';
import { Hero } from '@/components/public/Hero';
import { IcingDivider } from '@/components/public/IcingDivider';
import { CategoryFilter } from '@/components/public/CategoryFilter';
import { ProductCard } from '@/components/public/ProductCard';
import { BudgetCalculatorModal } from '@/components/public/BudgetCalculatorModal';
import { OurStory } from '@/components/public/OurStory';
import { Testimonials } from '@/components/public/Testimonials';
import { ContactFooter } from '@/components/public/ContactFooter';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';
import { AssistantChat } from '@/components/public/AssistantChat';

export default function PublicPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fillings, setFillings] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
  const [selectedVariationForModal, setSelectedVariationForModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes, fillRes, testRes, setRes, blockedRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/fillings'),
          fetch('/api/testimonials'),
          fetch('/api/settings'),
          fetch('/api/blocked-dates'),
        ]);

        const [prods, cats, fills, tests, sets, blocked] = await Promise.all([
          prodRes.json(),
          catRes.json(),
          fillRes.json(),
          testRes.json(),
          setRes.json(),
          blockedRes.json(),
        ]);

        if (Array.isArray(prods)) setProducts(prods);
        if (Array.isArray(cats)) setCategories(cats);
        if (Array.isArray(fills)) setFillings(fills);
        if (Array.isArray(tests)) setTestimonials(tests);
        if (typeof sets === 'object' && sets !== null) setSettings(sets);
        if (Array.isArray(blocked)) {
          setBlockedDates(blocked.map((b: any) => b.date.slice(0, 10)));
        }
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
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Navbar */}
      <Navbar
        onOpenBudgetModal={() => handleOpenModal()}
        whatsappNumber={settings.whatsapp_number}
        brandName={settings.bakery_name}
        logoUrl={settings.logo_url}
      />

      <main>
      {/* Hero Banner */}
      <Hero onOpenBudgetModal={() => handleOpenModal()} settings={settings} />
      <IcingDivider />

      {/* Catalog Showcase Section */}
      <section id="catalogo" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-widest text-[var(--color-accent-strong)] font-bold">
            Delícias Feitas à Mão
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-heading)]">
            Nosso Catálogo Especial
          </h2>
          <p className="text-sm text-[var(--color-text-soft)]">
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
          <div className="text-center py-12 bg-white rounded-3xl border border-[var(--color-border)] p-8">
            <p className="text-[var(--color-text-soft)] font-medium">Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </section>

      {/* Our Story */}
      <OurStory onOpenBudgetModal={() => handleOpenModal()} settings={settings} />

      {/* Testimonials */}
      <Testimonials testimonials={testimonials} />
      </main>

      {/* Footer */}
      <ContactFooter settings={settings} />

      {/* Floating WhatsApp Button */}
      <WhatsAppFloatingButton whatsappNumber={settings.whatsapp_number} />

      {/* Floating AI Assistant */}
      <AssistantChat whatsappNumber={settings.whatsapp_number} />

      {/* Interactive Budget Calculator Modal */}
      <BudgetCalculatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialProduct={selectedProductForModal}
        initialVariation={selectedVariationForModal}
        products={products}
        fillings={fillings}
        whatsappNumber={settings.whatsapp_number}
        blockedDates={blockedDates}
        minLeadDays={settings.min_lead_days ? parseInt(settings.min_lead_days) : 3}
      />
    </div>
  );
}
