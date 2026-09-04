'use client';

import React from 'react';
import { Sparkles, Cake, Cookie, Gift, LayoutGrid } from 'lucide-react';

interface CategoryFilterProps {
  categories: any[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

const CATEGORY_ICONS: Record<string, typeof Cake> = {
  bolos: Cake,
  biscoitos: Cookie,
  kits: Gift,
};

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap my-8">
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
          selectedCategory === 'all'
            ? 'bg-[#A75644] text-white shadow-blush font-semibold'
            : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Todos os Produtos
      </button>

      {categories.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.slug] || Sparkles;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              selectedCategory === cat.slug
                ? 'bg-[#A75644] text-white shadow-blush font-semibold'
                : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
