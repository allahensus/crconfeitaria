'use client';

import React from 'react';
import Link from 'next/link';
import { Instagram, Phone, MapPin, Clock, Heart, Shield } from 'lucide-react';

interface ContactFooterProps {
  settings?: Record<string, string>;
}

export function ContactFooter({ settings }: ContactFooterProps) {
  const whatsappNumber = settings?.whatsapp_number || '5512997594697';
  const instagram = settings?.instagram || '@crconfeitaria__';

  return (
    <footer id="contato" className="bg-[#3D312F] text-white pt-16 pb-12 border-t border-[#645451]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold text-[#F2D7D0]">
              Cinthia Rodrigues
            </h3>
            <p className="text-xs text-[#E3E0DE] leading-relaxed">
              Confeitaria artesanal de alta qualidade. Bolos e biscoitos preparados com afeto e sofisticação para celebrar seus momentos especiais.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Confeitaria Cinthia Rodrigues"
                className="w-9 h-9 rounded-full bg-[#645451] hover:bg-[#C27360] flex items-center justify-center transition-colors text-white"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Falar no WhatsApp"
                className="w-9 h-9 rounded-full bg-[#645451] hover:bg-emerald-600 flex items-center justify-center transition-colors text-white"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm text-[#F2D7D0] uppercase tracking-wider mb-4">
              Navegação
            </h4>
            <ul className="space-y-2.5 text-xs text-[#E3E0DE]">
              <li><a href="#catalogo" className="hover:text-[#F2D7D0] transition-colors">Catálogo de Bolos</a></li>
              <li><a href="#sabores" className="hover:text-[#F2D7D0] transition-colors">Cardápio de Recheios</a></li>
              <li><a href="#depoimentos" className="hover:text-[#F2D7D0] transition-colors">Avaliações de Clientes</a></li>
              <li><a href="#contato" className="hover:text-[#F2D7D0] transition-colors">Contato & Localização</a></li>
            </ul>
          </div>

          {/* Business Info */}
          <div>
            <h4 className="font-bold text-sm text-[#F2D7D0] uppercase tracking-wider mb-4">
              Atendimento
            </h4>
            <ul className="space-y-3 text-xs text-[#E3E0DE]">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C27360]" />
                <span>Terça a Sábado: 09h às 18h</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C27360]" />
                <span>São Paulo - SP (Sob Encomenda)</span>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-[#C27360]" />
                <span>Siga-nos: {instagram}</span>
              </li>
            </ul>
          </div>

          {/* Payment Methods Section */}
          <div>
            <h4 className="font-bold text-sm text-[#F2D7D0] uppercase tracking-wider mb-4">
              Formas de Pagamento
            </h4>
            <p className="text-xs text-[#E3E0DE] mb-3">
              Aceitamos diversas opções práticas para sua comodidade:
            </p>
            
            <div className="space-y-2.5">
              {/* Credit Card Badge */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#4A3B38] border border-[#645451] hover:border-[#C27360] transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-sm shrink-0 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="2" y="5" width="20" height="14" rx="3" strokeWidth="2"/>
                    <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2"/>
                    <rect x="6" y="14" width="4" height="2" rx="0.5" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Cartão de Crédito / Débito</span>
                  <span className="text-[10px] text-[#D8C7C3]">Visa, Mastercard, Elo e Hipercard</span>
                </div>
              </div>

              {/* Money / Cash Badge */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#4A3B38] border border-[#645451] hover:border-emerald-500 transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-sm shrink-0 text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                    <path d="M6 12h.01M18 12h.01" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Dinheiro em Espécie</span>
                  <span className="text-[10px] text-[#D8C7C3]">Pagamento direto na entrega ou retirada</span>
                </div>
              </div>

              {/* Pix Badge */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#4A3B38] border border-[#645451] hover:border-teal-400 transition-all">
                <div className="w-8 h-8 rounded-lg bg-[#32BCAD] flex items-center justify-center shadow-sm shrink-0 text-white font-bold text-xs">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 4.4L17.6 10L12 15.6L6.4 10L12 4.4ZM12 2L4 10L12 18L20 10L12 2Z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Pix Instantâneo</span>
                  <span className="text-[10px] text-[#D8C7C3]">Confirmação imediata para reserva de data</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-[#645451] text-center text-xs text-[#E3E0DE] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Confeitaria Cinthia Rodrigues. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1 text-gray-400">
            Desenvolvido com <Heart className="w-3.5 h-3.5 text-rose-400 fill-current" /> para impulsionar vendas
          </p>
        </div>
      </div>
    </footer>
  );
}
