// Applies or reverses the ingredient-stock effect of an order's items
// against their recipe (RecipeItem), when an order enters or leaves
// production. An item with no known product (productId null -- see
// OrderItem.productId) or a product with no recipe registered is skipped --
// a deliberate degrade, documented in the design spec, not a bug -- but the
// caller gets back exactly which items were skipped and why, instead of a
// bare stockDeducted:true that looks identical whether every item was
// actually deducted or none were. Surfacing this is what turns "a legitimate
// degrade" into something an operator can actually see and act on.

interface StockOrderItem {
  productId: string | null;
  quantity: number;
}

interface StockOrder {
  id: string;
  items: StockOrderItem[];
}

interface StockDb {
  recipeItem: {
    findMany: (args: { where: { productId: string } }) => Promise<{ ingredientId: string; quantityUsed: number }[]>;
  };
  ingredient: {
    update: (args: { where: { id: string }; data: { stockQuantity: { increment: number } } }) => Promise<unknown>;
  };
}

export interface SkippedStockItem {
  productId: string | null;
  reason: 'no_product_id' | 'no_recipe_registered';
}

export interface StockDeltaResult {
  skippedItems: SkippedStockItem[];
}

async function applyStockDelta(
  db: StockDb,
  order: StockOrder,
  sign: 1 | -1
): Promise<StockDeltaResult> {
  const skippedItems: SkippedStockItem[] = [];

  for (const item of order.items) {
    if (!item.productId) {
      skippedItems.push({ productId: null, reason: 'no_product_id' });
      continue;
    }

    const recipeItems = await db.recipeItem.findMany({
      where: { productId: item.productId },
    });

    if (recipeItems.length === 0) {
      skippedItems.push({ productId: item.productId, reason: 'no_recipe_registered' });
      continue;
    }

    for (const recipeItem of recipeItems) {
      const delta = recipeItem.quantityUsed * item.quantity;
      await db.ingredient.update({
        where: { id: recipeItem.ingredientId },
        data: { stockQuantity: { increment: sign * delta } },
      });
    }
  }

  return { skippedItems };
}

export async function deductStockForOrder(
  db: StockDb,
  order: StockOrder
): Promise<StockDeltaResult> {
  return applyStockDelta(db, order, -1);
}

export async function restoreStockForOrder(
  db: StockDb,
  order: StockOrder
): Promise<StockDeltaResult> {
  return applyStockDelta(db, order, 1);
}
