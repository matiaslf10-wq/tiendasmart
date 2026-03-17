export type StockProduct = {
  is_active?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  allow_backorder?: boolean | null;
};

export function isProductActive(product: StockProduct) {
  return product.is_active !== false;
}

export function isOutOfStock(product: StockProduct) {
  if (!isProductActive(product)) return true;
  if (!product.track_stock) return false;
  if (product.allow_backorder) return false;

  return (product.stock_quantity ?? 0) <= 0;
}

export function canPurchase(product: StockProduct) {
  return !isOutOfStock(product);
}

export function getMaxPurchasableQuantity(product: StockProduct) {
  if (!isProductActive(product)) return 0;
  if (!product.track_stock) return Number.POSITIVE_INFINITY;
  if (product.allow_backorder) return Number.POSITIVE_INFINITY;

  return Math.max(product.stock_quantity ?? 0, 0);
}

export function getStockLabel(product: StockProduct) {
  if (!isProductActive(product)) return 'No disponible';
  if (!product.track_stock) return 'Disponible';

  const stock = product.stock_quantity ?? 0;

  if (stock <= 0 && product.allow_backorder) {
    return 'Disponible por encargo';
  }

  if (stock <= 0) return 'Sin stock';
  if (stock <= 5) return 'Últimas unidades';

  return 'Disponible';
}