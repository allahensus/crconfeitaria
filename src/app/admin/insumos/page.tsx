'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  DollarSign,
  Calculator,
  Search,
  Check,
  X,
  AlertCircle,
  Percent,
  Layers,
  Sparkles,
  PackageX,
  ChefHat,
  ArrowRight,
} from 'lucide-react';

export default function AdminIngredientsPage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [packageQuantity, setPackageQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('Laticínios');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');

  // Pricing Simulator State
  const [markupMargin, setMarkupMargin] = useState(100); // 100% de lucro
  const [overheadPercent, setOverheadPercent] = useState(15); // 15% custos fixos (gás, luz)
  const [laborPercent, setLaborPercent] = useState(20); // 20% mão de obra

  // Ficha Técnica (Recipe) State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  const loadData = async () => {
    try {
      const [ingRes, prodRes] = await Promise.all([
        fetch('/api/ingredients'),
        fetch('/api/products?active=all'),
      ]);
      const ings = await ingRes.json();
      const prods = await prodRes.json();
      if (Array.isArray(ings)) setIngredients(ings);
      if (Array.isArray(prods)) setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRecipe = async (productId: string) => {
    if (!productId) {
      setRecipeItems([]);
      return;
    }
    setRecipeLoading(true);
    try {
      const res = await fetch(`/api/recipes?productId=${productId}`);
      const data = await res.json();
      if (Array.isArray(data)) setRecipeItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRecipeLoading(false);
    }
  };

  useEffect(() => {
    loadRecipe(selectedProductId);
  }, [selectedProductId]);

  const handleAddRecipeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !newIngredientId || !newQuantity) return;
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          ingredientId: newIngredientId,
          quantityUsed: newQuantity,
        }),
      });
      if (res.ok) {
        setNewIngredientId('');
        setNewQuantity('');
        loadRecipe(selectedProductId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRecipeQuantity = async (id: string, quantityUsed: string) => {
    if (!quantityUsed) return;
    try {
      await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityUsed }),
      });
      loadRecipe(selectedProductId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveRecipeItem = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    loadRecipe(selectedProductId);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const ingredientsCost = recipeItems.reduce((sum, item) => {
    const unitCost = item.ingredient.costPrice / (item.ingredient.packageQuantity || 1);
    return sum + item.quantityUsed * unitCost;
  }, 0);
  const fullCost = ingredientsCost * (1 + (overheadPercent + laborPercent) / 100);
  const suggestedPrice = fullCost * (1 + markupMargin / 100);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setUnit('g');
    setPackageQuantity('1000');
    setCostPrice('10');
    setCategory('Laticínios');
    setStockQuantity('0');
    setLowStockThreshold('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ing: any) => {
    setEditingId(ing.id);
    setName(ing.name);
    setUnit(ing.unit);
    setPackageQuantity(ing.packageQuantity.toString());
    setCostPrice(ing.costPrice.toString());
    setCategory(ing.category);
    setStockQuantity((ing.stockQuantity ?? 0).toString());
    setLowStockThreshold((ing.lowStockThreshold ?? 0).toString());
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        unit,
        packageQuantity: parseFloat(packageQuantity),
        costPrice: parseFloat(costPrice),
        category,
        stockQuantity: parseFloat(stockQuantity) || 0,
        lowStockThreshold: parseFloat(lowStockThreshold) || 0,
      };

      const url = editingId ? `/api/ingredients/${editingId}` : '/api/ingredients';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este insumo?')) {
      await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
      loadData();
    }
  };

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || ing.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categoriesList = Array.from(new Set(ingredients.map((i) => i.category)));
  const lowStockIngredients = ingredients.filter(
    (i) => (i.stockQuantity ?? 0) < 0 || ((i.lowStockThreshold || 0) > 0 && (i.stockQuantity || 0) <= i.lowStockThreshold)
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FAF6F4]">
      <AdminSidebar />

      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#C27360] text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full">
                SaaS Confeitaria Pro
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#4A231A] mt-1">
              Gestão de Insumos & Precificação Inteligente
            </h1>
            <p className="text-xs md:text-sm text-[#645451]">
              Atualize o preço dos ingredientes de compra e garanta a margem de lucro de toda a confeitaria automaticamente
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-[#C27360] hover:bg-[#A75644] text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Novo Insumo / Ingrediente
          </button>
        </div>

        {/* Low Stock Alert Banner */}
        {lowStockIngredients.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <PackageX className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-sm text-amber-900">
                Estoque baixo em {lowStockIngredients.length} insumo{lowStockIngredients.length > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStockIngredients.map((i) => `${i.name} (${i.stockQuantity} ${i.unit})`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Pricing Engine Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-[#F2D7D0] shadow-card space-y-2">
            <div className="flex items-center justify-between text-xs text-[#A75644] font-bold uppercase tracking-wider">
              <span>Margem de Lucro Desejada</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={markupMargin}
                onChange={(e) => setMarkupMargin(Number(e.target.value))}
                className="w-20 p-2 rounded-xl border border-[#F2D7D0] text-lg font-extrabold text-[#4A231A] outline-none text-center"
              />
              <span className="text-sm font-bold text-[#C27360]">% de Margem Líquida</span>
            </div>
            <p className="text-[11px] text-gray-500">Multiplica o custo total para calcular a venda recomendada.</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#F2D7D0] shadow-card space-y-2">
            <div className="flex items-center justify-between text-xs text-[#A75644] font-bold uppercase tracking-wider">
              <span>Custos Fixos (Gás/Energia)</span>
              <Percent className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={overheadPercent}
                onChange={(e) => setOverheadPercent(Number(e.target.value))}
                className="w-20 p-2 rounded-xl border border-[#F2D7D0] text-lg font-extrabold text-[#4A231A] outline-none text-center"
              />
              <span className="text-sm font-bold text-indigo-600">% de Custo Indireto</span>
            </div>
            <p className="text-[11px] text-gray-500">Gás de cozinha, luz, desgaste de utensílios e água.</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#F2D7D0] shadow-card space-y-2">
            <div className="flex items-center justify-between text-xs text-[#A75644] font-bold uppercase tracking-wider">
              <span>Mão de Obra da Confeiteira</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={laborPercent}
                onChange={(e) => setLaborPercent(Number(e.target.value))}
                className="w-20 p-2 rounded-xl border border-[#F2D7D0] text-lg font-extrabold text-[#4A231A] outline-none text-center"
              />
              <span className="text-sm font-bold text-purple-600">% Remuneração</span>
            </div>
            <p className="text-[11px] text-gray-500">Garante o salário e tempo de produção da confeiteira.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo por nome (ex: Leite Condensado)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#F2D7D0] bg-white text-sm text-[#4A231A] focus:ring-2 focus:ring-[#C27360] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#C27360] text-white'
                  : 'bg-white text-[#4A231A] border border-[#F2D7D0]'
              }`}
            >
              Todos os Insumos
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#C27360] text-white'
                    : 'bg-white text-[#4A231A] border border-[#F2D7D0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card overflow-hidden">
          <div className="p-5 border-b border-[#F2D7D0] flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#4A231A]">
              Tabela de Custos de Insumos Atualizados ({filteredIngredients.length})
            </h3>
            <span className="text-xs text-gray-500">
              💡 Alterando o custo pago no mercado, o preço dos bolos é recalculado na hora!
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-[#645451]">Carregando insumos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#4A231A]">
                <thead className="bg-[#FAF6F4] uppercase text-[10px] tracking-wider text-[#A75644] font-bold border-b border-[#F2D7D0]">
                  <tr>
                    <th className="p-4">Ingrediente / Insumo</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Pacote Comprado</th>
                    <th className="p-4">Preço Pago no Mercado</th>
                    <th className="p-4">Custo Unitário</th>
                    <th className="p-4">Estoque Atual</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2D7D0]/60">
                  {filteredIngredients.map((ing) => {
                    const unitCost = ing.costPrice / (ing.packageQuantity || 1);
                    const isLowStock =
                      (ing.stockQuantity ?? 0) < 0 || ((ing.lowStockThreshold || 0) > 0 && (ing.stockQuantity || 0) <= ing.lowStockThreshold);
                    return (
                      <tr key={ing.id} className="hover:bg-[#FDF7F6] transition-colors">
                        <td className="p-4 font-bold text-sm text-[#4A231A]">
                          {ing.name}
                        </td>
                        <td className="p-4">
                          <span className="bg-[#FAF6F4] text-[#C27360] font-semibold px-2.5 py-1 rounded-full text-[11px] border border-[#F2D7D0]">
                            {ing.category}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-semibold">
                          {ing.packageQuantity} {ing.unit}
                        </td>
                        <td className="p-4 font-bold text-emerald-700 font-serif text-sm">
                          {formatCurrency(ing.costPrice)}
                        </td>
                        <td className="p-4 font-mono text-gray-600">
                          {formatCurrency(unitCost)} / {ing.unit}
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded ${
                              isLowStock ? 'bg-amber-100 text-amber-800' : 'text-[#4A231A]'
                            }`}
                          >
                            {ing.stockQuantity ?? 0} {ing.unit}
                          </span>
                          {isLowStock && (
                            <span className="block text-[9px] font-bold text-amber-700 uppercase mt-0.5">
                              ⚠️ Estoque baixo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(ing)}
                              className="p-2 rounded-lg bg-white border border-[#F2D7D0] text-[#4A231A] hover:bg-[#FDF7F6]"
                              title="Editar preço pago"
                            >
                              <Edit2 className="w-4 h-4 text-[#C27360]" />
                            </button>
                            <button
                              onClick={() => handleDelete(ing.id)}
                              className="p-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                              title="Excluir insumo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ficha Técnica por Produto */}
        <div className="bg-white rounded-3xl border border-[#F2D7D0] shadow-card overflow-hidden">
          <div className="p-5 border-b border-[#F2D7D0] flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-[#C27360]" />
            <div>
              <h3 className="font-serif font-bold text-lg text-[#4A231A]">Ficha Técnica</h3>
              <p className="text-xs text-[#645451]">
                Vincule os insumos usados em cada produto pra calcular o custo real e o preço sugerido
              </p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A75644] mb-1">
                Produto
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full max-w-md p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
              >
                <option value="">Selecione um produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProductId && (
              <>
                {recipeLoading ? (
                  <div className="py-6 text-center text-sm text-[#645451]">Carregando receita...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#4A231A]">
                      <thead className="bg-[#FAF6F4] uppercase text-[10px] tracking-wider text-[#A75644] font-bold border-b border-[#F2D7D0]">
                        <tr>
                          <th className="p-3">Insumo</th>
                          <th className="p-3">Quantidade Usada</th>
                          <th className="p-3">Custo</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2D7D0]/60">
                        {recipeItems.map((item) => {
                          const unitCost = item.ingredient.costPrice / (item.ingredient.packageQuantity || 1);
                          const lineCost = item.quantityUsed * unitCost;
                          return (
                            <tr key={item.id}>
                              <td className="p-3 font-bold">{item.ingredient.name}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  step="any"
                                  defaultValue={item.quantityUsed}
                                  onBlur={(e) => handleUpdateRecipeQuantity(item.id, e.target.value)}
                                  className="w-24 p-1.5 rounded-lg border border-[#F2D7D0] text-xs outline-none focus:ring-2 focus:ring-[#C27360]"
                                />
                                <span className="ml-1 text-gray-500">{item.ingredient.unit}</span>
                              </td>
                              <td className="p-3 font-mono text-emerald-700 font-semibold">
                                {formatCurrency(lineCost)}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRemoveRecipeItem(item.id)}
                                  className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {recipeItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500">
                              Nenhum insumo vinculado a este produto ainda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <form onSubmit={handleAddRecipeItem} className="flex flex-wrap items-end gap-3 p-4 bg-[#FAF6F4] rounded-2xl border border-[#F2D7D0]">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Insumo</label>
                    <select
                      value={newIngredientId}
                      onChange={(e) => setNewIngredientId(e.target.value)}
                      className="p-2 rounded-xl border border-[#F2D7D0] text-xs outline-none focus:ring-2 focus:ring-[#C27360]"
                    >
                      <option value="">Selecione...</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#A75644] mb-1">Quantidade</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 150"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="w-28 p-2 rounded-xl border border-[#F2D7D0] text-xs outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#C27360] text-white text-xs font-bold shadow-md hover:bg-[#A75644] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </form>

                {recipeItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-[#F2D7D0] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Custo dos ingredientes</span>
                        <span className="font-mono font-semibold">{formatCurrency(ingredientsCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">+ Custo fixo e mão de obra ({overheadPercent + laborPercent}%)</span>
                        <span className="font-mono font-semibold">{formatCurrency(fullCost - ingredientsCost)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-[#F2D7D0] font-bold">
                        <span className="text-[#4A231A]">Custo total de produção</span>
                        <span className="font-mono text-[#4A231A]">{formatCurrency(fullCost)}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF6F4] border border-[#F2D7D0] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Preço sugerido (+{markupMargin}% margem)</span>
                        <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(suggestedPrice)}</span>
                      </div>
                      {selectedProduct && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Preço atual do produto</span>
                          <span className="font-mono font-bold text-sm text-[#4A231A]">{formatCurrency(selectedProduct.basePrice)}</span>
                        </div>
                      )}
                      {selectedProduct && (
                        <div
                          className={`flex items-center gap-1.5 pt-1.5 border-t border-[#F2D7D0] font-bold ${
                            selectedProduct.basePrice < suggestedPrice ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {selectedProduct.basePrice < suggestedPrice
                            ? `Vendendo ${formatCurrency(suggestedPrice - selectedProduct.basePrice)} abaixo do sugerido`
                            : `Preço atual cobre a margem desejada`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#F2D7D0] shadow-2xl my-8 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#F2D7D0]">
                <h3 className="font-serif font-bold text-xl text-[#4A231A]">
                  {editingId ? 'Atualizar Preço do Insumo' : 'Cadastrar Novo Insumo'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                    Nome do Ingrediente / Insumo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Leite Condensado Moça"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Categoria *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    >
                      <option value="Laticínios">Laticínios</option>
                      <option value="Chocolates">Chocolates</option>
                      <option value="Secos">Secos (Farinha, Açúcar)</option>
                      <option value="Frescos">Frescos (Ovos, Frutas)</option>
                      <option value="Coberturas">Coberturas & Chantilly</option>
                      <option value="Embalagens">Embalagens & Caixas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Unidade de Medida *
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    >
                      <option value="g">Gramas (g)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilos (kg)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Quantidade da Embalagem *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Ex: 395 para lata 395g"
                      value={packageQuantity}
                      onChange={(e) => setPackageQuantity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Preço Pago no Mercado (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 7.50"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Estoque Atual
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 2000"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Em {unit}, quanto você tem agora</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#A75644] mb-1">
                      Alertar Estoque Baixo
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 200"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#F2D7D0] text-sm outline-none focus:ring-2 focus:ring-[#C27360]"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Abaixo disso, mostra alerta (0 = sem alerta)</p>
                  </div>
                </div>

                {packageQuantity && costPrice && (
                  <div className="p-3 bg-[#FAF6F4] rounded-xl border border-[#F2D7D0] text-xs space-y-1">
                    <span className="font-bold text-[#4A231A] block">Custo Unitário Calculado:</span>
                    <p className="text-emerald-700 font-bold font-mono">
                      {formatCurrency(parseFloat(costPrice) / parseFloat(packageQuantity))} por {unit}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-[#F2D7D0]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#C27360] text-white text-xs font-bold shadow-md hover:bg-[#A75644]"
                  >
                    Salvar Insumo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
