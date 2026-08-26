'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles, Heart, ArrowRight } from 'lucide-react';

interface HeroProps {
  onOpenBudgetModal: () => void;
}

export function Hero({ onOpenBudgetModal }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-12 md:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text & CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#F2D7D0] text-[#A75644] text-xs sm:text-sm font-semibold shadow-sm backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[#C27360]" />
              <span>Confeitaria Artesanal Personalizada</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#4A231A] tracking-tight leading-tight">
              Transforme seus momentos em lembranças{' '}
              <span className="text-gradient-rose italic font-normal">irresistíveis</span>
            </h1>

            <p className="text-base sm:text-lg text-[#645451] max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Bolos altos super recheados, Bentô Cakes personalizados e biscoitos amanteigados feitos artesanalmente com ingredientes nobres para adoçar a sua festa.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onOpenBudgetModal}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#C27360] via-[#A75644] to-[#874132] text-white font-semibold text-base shadow-blush hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <span>Montar Orçamento Instantâneo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#catalogo"
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-white/90 text-[#4A3531] font-semibold text-base border border-[#F2D7D0] hover:bg-[#FDF7F6] transition-colors shadow-sm text-center"
              >
                Ver Catálogo
              </a>
            </div>

            {/* Badges / Social Proof */}
            <div className="pt-8 border-t border-[#F2D7D0]/60 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl sm:text-3xl font-bold text-[#A75644] font-serif">+500</span>
                <span className="text-xs text-[#645451] font-medium">Festas Adoçadas</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl sm:text-3xl font-bold text-[#A75644] font-serif">100%</span>
                <span className="text-xs text-[#645451] font-medium">Artesanal & Nobre</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-2xl sm:text-3xl font-bold text-[#A75644] font-serif">20+</span>
                <span className="text-xs text-[#645451] font-medium">Sabores Especiais</span>
              </div>
            </div>
          </div>

          {/* Right: Editorial Photo Panel */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">

              {/* Main Photo — full, straight, no tilt: the photography is the point */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[#4A231A]/5 bg-white aspect-[4/5]">
                <Image
                  src="/images/bento_cake.jpg"
                  alt="Bentô Cake Cinthia Rodrigues"
                  fill
                  priority
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#2A1712]/80 via-[#2A1712]/10 to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#F2D7D0] font-semibold mb-1.5">
                    Destaque da Confeitaria
                  </span>
                  <h3 className="font-serif text-2xl font-bold leading-tight">Bentô Cake Personalizado</h3>
                  <p className="text-xs text-white/80 mt-1">Acompanha hamburgueira decorada, colher de madeira e vela</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-serif text-xl font-bold text-white">R$ 95,00</span>
                    <button
                      onClick={onOpenBudgetModal}
                      className="px-4 py-2 bg-white text-[#4A231A] text-xs font-bold rounded-full shadow hover:bg-[#FDF7F6] transition-colors"
                    >
                      Pedir o Seu
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiet supporting detail — handmade credibility, not decoration */}
              <div className="mt-4 flex items-center gap-2.5 px-1">
                <Heart className="w-4 h-4 text-[#C27360] fill-current shrink-0" />
                <p className="text-xs text-[#645451]">
                  <span className="font-bold text-[#4A231A]">Feito à mão</span> — massa fofinha e recheios caseiros, do jeito que uma festa de verdade merece.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
