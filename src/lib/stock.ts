// Applies or reverses the ingredient-stock effect of an order's items
// against their recipe (RecipeItem), when an order enters or leaves
// production. An item with no known product (productId null -- see
// OrderItem.productId) or a product with no recipe registered is silently
// skipped: a deliberate degrade documented in the design spec, not a bug.

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

async function applyStockDelta(
  db: StockDb,
  order: StockOrder,
  sign: 1 | -1
): Promise<void> {
  for (const item of order.items) {
    if (!item.productId) continue;

    const recipeItems = await db.recipeItem.findMany({
      where: { productId: item.productId },
    });

    for (const recipeItem of recipeItems) {
      const delta = recipeItem.quantityUsed * item.quantity;
      await db.ingredient.update({
        where: { id: recipeItem.ingredientId },
        data: { stockQuantity: { increment: sign * delta } },
      });
    }
  }
}

export async function deductStockForOrder(
  db: StockDb,
  order: StockOrder
): Promise<void> {
  await applyStockDelta(db, order, -1);
}

export async function restoreStockForOrder(
  db: StockDb,
  order: StockOrder
): Promise<void> {
  await applyStockDelta(db, order, 1);
}
