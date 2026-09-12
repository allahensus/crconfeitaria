'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Images, X, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const eventTypes = useMemo(
    () => Array.from(new Set(items.map((i) => i.eventType).filter(Boolean))),
    [items]
  );

  const filteredItems =
    selectedType === 'all' ? items : items.filter((i) => i.eventType === selectedType);

  const lightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const showPrev = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  };
  const showNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, filteredItems.length]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-deep)] hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a loja
        </Link>

        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-widest text-[var(--color-accent)] font-bold">
            Nossos Trabalhos
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-heading)] mt-2">
            Galeria
          </h1>
          <p className="text-sm text-[var(--color-text-soft)] mt-2">
            Fotos de bolos e doces já entregues para clientes de verdade.
          </p>
        </div>

        {eventTypes.length > 0 && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-10">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === 'all'
                  ? 'bg-[var(--color-accent)] text-white shadow-blush font-semibold'
                  : 'bg-white text-[#4A3531] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Todos
            </button>
            {eventTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedType === type
                    ? 'bg-[var(--color-accent)] text-white shadow-blush font-semibold'
                    : 'bg-white text-[#4A3531] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[var(--color-text-soft)]">Carregando galeria...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[var(--color-border)] p-10 text-center shadow-card max-w-lg mx-auto">
            <Images className="w-8 h-8 text-[var(--color-border)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-soft)]">
              Em breve mais fotos dos nossos trabalhos por aqui.
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 gap-4 space-y-4">
            {filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="block w-full break-inside-avoid rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-card bg-white group"
              >
                <div className="relative w-full overflow-hidden">
                  <div className="group-hover:scale-105 transition-transform duration-300">
                    <Image
                      src={item.imageUrl}
                      alt={item.caption || item.eventType}
                      width={600}
                      height={600}
                      className="w-full h-auto object-cover"
                      style={{
                        objectPosition: `${item.imagePosX ?? 50}% ${item.imagePosY ?? 50}%`,
                        transform: `scale(${item.imageZoom ?? 1})`,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {filteredItems.length > 1 && (
              <span className="absolute -top-10 left-0 text-xs font-semibold text-white/80">
                {lightboxIndex + 1} / {filteredItems.length}
              </span>
            )}

            <div className="relative w-full aspect-square sm:aspect-video rounded-2xl overflow-hidden">
              <Image
                key={lightboxItem.id}
                src={lightboxItem.imageUrl}
                alt={lightboxItem.caption || lightboxItem.eventType}
                fill
                className="object-contain bg-black"
              />

              {filteredItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showPrev();
                    }}
                    aria-label="Foto anterior"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showNext();
                    }}
                    aria-label="Próxima foto"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {(lightboxItem.caption || lightboxItem.eventType) && (
              <div className="bg-white rounded-b-2xl p-4">
                {lightboxItem.eventType && (
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-deep)]">
                    {lightboxItem.eventType}
                  </span>
                )}
                {lightboxItem.caption && (
                  <p className="text-sm text-[#4A3531] mt-1">{lightboxItem.caption}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
