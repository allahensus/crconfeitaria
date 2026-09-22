'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X, Sparkles, PhoneCall, ShieldCheck, Cake, Heart as HeartIcon, Star, MapPin, Lock, Package, Images, MessageCircleQuestion } from 'lucide-react';

interface NavbarProps {
  onOpenBudgetModal: (product?: any) => void;
  onOpenAssistant?: () => void;
  whatsappNumber?: string;
  brandName?: string;
  logoUrl?: string;
}

export function Navbar({
  onOpenBudgetModal,
  onOpenAssistant,
  whatsappNumber = '5512997594697',
  brandName = 'Cinthia Rodrigues',
  logoUrl = '/images/logo_cinthia.png',
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#E6B9AE] p-0.5 shadow-sm group-hover:scale-105 transition-transform bg-white">
              <Image
                src={logoUrl}
                alt={`Logo ${brandName}`}
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-heading)] leading-none">
                {brandName}
              </span>
              <span className="text-[11px] uppercase tracking-widest text-[var(--color-accent-strong)] font-semibold mt-1">
                Confeitaria Artesanal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A3531]">
            <a href="#catalogo" className="hover:text-[var(--color-accent)] transition-colors">
              Catálogo
            </a>
            <a href="#historia" className="hover:text-[var(--color-accent)] transition-colors">
              Nossa História
            </a>
            <a href="#depoimentos" className="hover:text-[var(--color-accent)] transition-colors">
              Avaliações
            </a>
            <Link href="/galeria" className="hover:text-[var(--color-accent)] transition-colors">
              Galeria
            </Link>
            <a href="#contato" className="hover:text-[var(--color-accent)] transition-colors">
              Contato
            </a>
            <Link href="/pedido" className="hover:text-[var(--color-accent)] transition-colors">
              Acompanhar Pedido
            </Link>
            <Link href="/admin/login" className="text-xs text-[var(--color-accent-deep)] hover:underline opacity-80">
              Área da Confeiteira
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                aria-label="Tirar dúvidas com a Açucena"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[var(--color-border)] text-[var(--color-accent-strong)] font-medium hover:bg-[var(--color-accent-soft)] transition-colors duration-200 text-sm"
              >
                <MessageCircleQuestion className="w-4 h-4" />
                Falar com a Açucena
              </button>
            )}
            <button
              onClick={() => onOpenBudgetModal()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] text-white font-medium shadow-blush hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-surface-alt)]" />
              Montar Orçamento
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                aria-label="Tirar dúvidas com a Açucena"
                className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-accent-strong)]"
              >
                <MessageCircleQuestion className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onOpenBudgetModal()}
              className="px-3.5 py-1.5 rounded-full bg-[var(--color-accent-strong)] text-white text-xs font-semibold shadow-sm"
            >
              Orçar
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#4A3531] hover:bg-[var(--color-accent-soft)] transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[var(--color-border)] px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3 font-medium text-[#4A3531]">
            {onOpenAssistant && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAssistant();
                }}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5 text-left"
              >
                <MessageCircleQuestion className="w-4 h-4 text-[var(--color-accent)]" /> Tirar Dúvidas com a Açucena
              </button>
            )}
            <a
              href="#catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <Cake className="w-4 h-4 text-[var(--color-accent)]" /> Nosso Catálogo
            </a>
            <a
              href="#historia"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <HeartIcon className="w-4 h-4 text-[var(--color-accent)]" /> Nossa História
            </a>
            <a
              href="#depoimentos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <Star className="w-4 h-4 text-[var(--color-accent)]" /> Depoimentos
            </a>
            <Link
              href="/galeria"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <Images className="w-4 h-4 text-[var(--color-accent)]" /> Galeria
            </Link>
            <a
              href="#contato"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <MapPin className="w-4 h-4 text-[var(--color-accent)]" /> Horários e Endereço
            </a>
            <Link
              href="/pedido"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[var(--color-surface-alt)] text-base flex items-center gap-2.5"
            >
              <Package className="w-4 h-4 text-[var(--color-accent)]" /> Acompanhar Pedido
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-xs text-[var(--color-accent-deep)] font-semibold uppercase tracking-wider flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" /> Acesso Restrito - Confeiteira
            </Link>
          </nav>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBudgetModal();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-strong)] text-white font-medium shadow-blush text-center flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Solicitar Orçamento Agora
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
