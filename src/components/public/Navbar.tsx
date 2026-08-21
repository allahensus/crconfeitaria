'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X, Sparkles, PhoneCall, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenBudgetModal: (product?: any) => void;
  whatsappNumber?: string;
}

export function Navbar({ onOpenBudgetModal, whatsappNumber = '5511999999999' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#E6B9AE] p-0.5 shadow-sm group-hover:scale-105 transition-transform bg-white">
              <Image
                src="/images/logo_cinthia.png"
                alt="Logo Cinthia Rodrigues Confeitaria"
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#4A231A] leading-none">
                Cinthia Rodrigues
              </span>
              <span className="text-[11px] uppercase tracking-widest text-[#C27360] font-semibold mt-1">
                Confeitaria Artesanal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4A3531]">
            <a href="#catalogo" className="hover:text-[#C27360] transition-colors">
              Catálogo
            </a>
            <a href="#sabores" className="hover:text-[#C27360] transition-colors">
              Cardápio de Recheios
            </a>
            <a href="#depoimentos" className="hover:text-[#C27360] transition-colors">
              Avaliações
            </a>
            <a href="#contato" className="hover:text-[#C27360] transition-colors">
              Contato
            </a>
            <Link href="/admin/login" className="text-xs text-[#874132] hover:underline opacity-80">
              Área da Confeiteira
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onOpenBudgetModal()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-medium shadow-blush hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
            >
              <Sparkles className="w-4 h-4 text-[#FDF7F6]" />
              Montar Orçamento
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => onOpenBudgetModal()}
              className="px-3.5 py-1.5 rounded-full bg-[#C27360] text-white text-xs font-semibold shadow-sm"
            >
              Orçar
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#4A3531] hover:bg-[#F9ECE9] transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#F2D7D0] px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3 font-medium text-[#4A3531]">
            <a
              href="#catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FDF7F6] text-base"
            >
              🎂 Nosso Catálogo
            </a>
            <a
              href="#sabores"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FDF7F6] text-base"
            >
              🍓 Cardápio de Recheios
            </a>
            <a
              href="#depoimentos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FDF7F6] text-base"
            >
              ⭐ Depoimentos
            </a>
            <a
              href="#contato"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FDF7F6] text-base"
            >
              📍 Horários e Endereço
            </a>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-xs text-[#874132] font-semibold uppercase tracking-wider"
            >
              🔐 Acesso Restrito - Confeiteira
            </Link>
          </nav>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBudgetModal();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C27360] to-[#A75644] text-white font-medium shadow-blush text-center flex items-center justify-center gap-2"
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
