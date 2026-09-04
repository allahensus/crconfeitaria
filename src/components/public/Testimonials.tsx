'use client';

import React from 'react';
import { Star, Quote, Heart } from 'lucide-react';

interface TestimonialsProps {
  testimonials: any[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section id="depoimentos" className="py-16 bg-[#FAF6F4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest text-[#A75644] font-bold">
            Amor em Cada Detalhe
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#4A231A] mt-2">
            O que nossas clientes dizem
          </h2>
          <p className="text-sm text-[#645451] mt-2">
            A maior recompensa é fazer parte dos seus momentos inesquecíveis.
          </p>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-white p-8 rounded-3xl border border-[#F2D7D0] shadow-card hover:shadow-xl transition-all duration-300 relative flex flex-col justify-between"
            >
              <div>
                {/* Stars */}
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(t.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-sm text-[#4A3531] italic leading-relaxed mb-6">
                  "{t.comment}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#F2D7D0]/50">
                <div className="w-10 h-10 rounded-full bg-[#F9ECE9] text-[#C27360] font-bold flex items-center justify-center text-sm font-serif">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#4A231A]">{t.name}</h3>
                  <span className="text-xs text-[#A75644] font-medium">{t.eventType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
