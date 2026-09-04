'use client';

import React from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { Sparkles, Users, Layers, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: any;
  onOpenBudgetModal: (product: any, variation?: any) => void;
}

export function ProductCard({ product, onOpenBudgetModal }: ProductCardProps) {
  const [imgSrc, setImgSrc] = React.useState(product.mainImage);

  const minPrice = product.variations && product.variations.length > 0
    ? Math.min(...product.variations.map((v: any) => v.price))
    : product.basePrice;

  const hasVariations = product.variations && product.variations.length > 0;
  const isCoverFit = product.imageFit === 'cover';

  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-[#F2D7D0] shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Product Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FDF7F6]">
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`transition-transform duration-500 ${
              isCoverFit ? 'object-cover' : 'object-contain group-hover:scale-105'
            }`}
            style={
              isCoverFit
                ? {
                    objectPosition: `${product.imagePosX ?? 50}% ${product.imagePosY ?? 50}%`,
                    transform: `scale(${product.imageZoom ?? 1})`,
                  }
                : undefined
            }
            onError={() => setImgSrc('/images/bento_cake.jpg')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
          
          {product.featured && (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-[#C27360] to-[#A75644] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-10">
              <Sparkles className="w-3 h-3" /> Mais Pedido
            </span>
          )}

          {product.yieldInfo && (
            <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-[#4A231A] text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm border border-[#F2D7D0] flex items-center gap-1 z-10">
              <Users className="w-3 h-3 text-[#C27360]" /> {product.yieldInfo}
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#A75644] font-bold">
              {product.category?.name || 'Confeitaria'}
            </span>
          </div>

          <h3 className="font-serif text-xl font-bold text-[#4A231A] group-hover:text-[#C27360] transition-colors">
            {product.name}
          </h3>

          <p className="text-xs sm:text-sm text-[#645451] line-clamp-3 leading-relaxed">
            {product.description}
          </p>

          {/* Interactive Clickable Variations Pills */}
          {hasVariations && (
            <div className="pt-2 flex flex-wrap gap-1.5">
              {product.variations.map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBudgetModal(product, v);
                  }}
                  className="text-[11px] bg-[#FDF7F6] hover:bg-[#C27360] hover:text-white text-[#874132] font-semibold px-2.5 py-1 rounded-lg border border-[#F2D7D0] transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title={`Clique para orçar no tamanho ${v.name}`}
                >
                  <span>{v.name}</span>
                  <span className="text-[10px]">({formatCurrency(v.price)})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Price & Action */}
      <div className="p-6 pt-0 border-t border-[#F2D7D0]/40 flex items-center justify-between mt-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#A75644] block">
            {hasVariations ? 'A partir de' : 'Valor'}
          </span>
          <span className="text-xl font-extrabold text-[#4A231A] font-serif">
            {formatCurrency(minPrice)}
          </span>
        </div>

        <button
          onClick={() => onOpenBudgetModal(product)}
          className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#C27360] to-[#A75644] text-white text-xs font-semibold shadow-blush hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
        >
          <span>Orçar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
