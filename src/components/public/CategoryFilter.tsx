'use client';

import React from 'react';

interface CategoryFilterProps {
  categories: any[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap my-8">
      <button
        onClick={() => onSelectCategory('all')}
        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
          selectedCategory === 'all'
            ? 'bg-[#C27360] text-white shadow-blush font-semibold'
            : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
        }`}
      >
        ✨ Todos os Produtos
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.slug)}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
            selectedCategory === cat.slug
              ? 'bg-[#C27360] text-white shadow-blush font-semibold'
              : 'bg-white text-[#4A3531] border border-[#F2D7D0] hover:bg-[#FDF7F6]'
          }`}
        >
          {cat.slug === 'bolos' && '🎂 '}
          {cat.slug === 'biscoitos' && '🍪 '}
          {cat.slug === 'kits' && '🎁 '}
          {cat.name}
        </button>
      ))}
    </div>
  );
}
