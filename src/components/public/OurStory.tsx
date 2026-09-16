'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Award, CalendarCheck2, Sparkles, MessageCircle } from 'lucide-react';

interface OurStoryProps {
  onOpenBudgetModal: () => void;
  settings?: Record<string, string>;
}

export function OurStory({ onOpenBudgetModal, settings }: OurStoryProps) {
  const s = settings || {};
  const bakeryName = s.bakery_name || 'Cinthia Rodrigues';
  const whatsappNumber = s.whatsapp_number || '5512997594697';

  const photoSrc = s.about_photo_image || '/images/logo_cinthia.png';
  const photoZoom = parseFloat(s.about_photo_zoom || '1') || 1;
  const photoPosX = s.about_photo_pos_x !== undefined ? parseFloat(s.about_photo_pos_x) : 50;
  const photoPosY = s.about_photo_pos_y !== undefined ? parseFloat(s.about_photo_pos_y) : 20;

  const roleTitle = s.about_role_title || 'Pâtisserie';
  const roleSubtitle = s.about_role_subtitle || 'Técnica e ingredientes nobres';

  const heading = s.about_heading || 'Feito com afeto para celebrar a';
  const headingAccent = s.about_heading_accent || 'doçura da vida';

  const paragraph1 =
    s.about_paragraph_1 ||
    `Na ${bakeryName} Confeitaria Artesanal, cada receita nasce da crença de que uma festa de verdade merece sabor de lembrança boa de infância, somado à sofisticação da alta pâtisserie.`;
  const paragraph2 =
    s.about_paragraph_2 ||
    'Não usamos misturas prontas, estabilizantes industriais ou gordura vegetal. Nossas massas amanteigadas são assadas lentamente para obter textura macia e fofa, combinadas com reduções caseiras de frutas naturais, brigadeiros de panela gourmet e chocolates nobres.';

  return (
    <section id="historia" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

        {/* Photo */}
        <div className="lg:col-span-5 relative">
          <div className="relative mx-auto max-w-sm lg:max-w-none aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[#4A231A]/5 bg-white">
            <Image
              src={photoSrc}
              alt={`${bakeryName} — confeiteira`}
              fill
              className="object-cover"
              style={{
                objectPosition: `${photoPosX}% ${photoPosY}%`,
                transform: `scale(${photoZoom})`,
              }}
            />
          </div>

          <div className="absolute -bottom-5 left-6 sm:left-10 bg-white rounded-2xl shadow-blush border border-[var(--color-border)] px-4 py-3 flex items-center gap-3 max-w-[calc(100%-3rem)]">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-[var(--color-heading)] truncate">{roleTitle}</span>
              <span className="block text-[11px] text-[var(--color-text-soft)] truncate">{roleSubtitle}</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="lg:col-span-7 space-y-5 pt-6 lg:pt-0">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5" />
            Nossa História & Propósito
          </div>

          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-heading)] leading-tight">
            {heading}{' '}
            <span className="block text-gradient-rose italic font-normal">{headingAccent}</span>
          </h2>

          <p className="text-sm sm:text-base text-[var(--color-text-soft)] leading-relaxed">
            {paragraph1}
          </p>
          <p className="text-sm sm:text-base text-[var(--color-text-soft)] leading-relaxed">
            {paragraph2}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-2.5">
              <CalendarCheck2 className="w-5 h-5 text-[var(--color-accent-strong)] shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-bold text-[var(--color-heading)]">Datas Antecipadas</span>
                <span className="block text-xs text-[var(--color-text-soft)]">Produção artesanal com vagas limitadas para garantir frescor total.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-[var(--color-accent-strong)] shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-bold text-[var(--color-heading)]">Personalização Total</span>
                <span className="block text-xs text-[var(--color-text-soft)]">Cores, flores naturais, brigadeiros boleados ou topos temáticos.</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenBudgetModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-accent-strong)] text-white font-bold text-sm shadow-blush hover:bg-[var(--color-accent-deep)] transition-all"
          >
            <CalendarCheck2 className="w-4 h-4" />
            Consultar Disponibilidade de Data
          </button>
        </div>
      </div>

      {/* Direct contact banner */}
      <div className="mt-14 rounded-3xl bg-[var(--color-accent-deep)] text-white px-6 sm:px-10 py-8 sm:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">
            Fale Diretamente com {bakeryName.split(' ')[0]}
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold mt-1.5">
            Tem um tema especial ou dúvida de sabores?
          </h3>
          <p className="text-sm text-white/80 mt-2 max-w-lg">
            Envie referências de fotos, quantidade de convidados e data da comemoração para receber uma proposta personalizada.
          </p>
        </div>
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-[var(--color-accent-deep)] font-bold text-sm shadow-lg hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Conversar no WhatsApp
        </a>
      </div>
    </section>
  );
}
