export type FunnelData = {
  views: number;
  addToCart: number;
  checkout: number;
  whatsapp: number;
  orders: number;
};

export type FunnelConversion = {
  viewToCart: number;
  cartToCheckout: number;
  checkoutToWhatsapp: number;
  whatsappToOrder: number;
  totalConversion: number;
};

function safeDivide(a: number, b: number) {
  if (!b || b === 0) return 0;
  return (a / b) * 100;
}

export function buildFunnelConversion(data: FunnelData): FunnelConversion {
  return {
    viewToCart: safeDivide(data.addToCart, data.views),
    cartToCheckout: safeDivide(data.checkout, data.addToCart),
    checkoutToWhatsapp: safeDivide(data.whatsapp, data.checkout),
    whatsappToOrder: safeDivide(data.orders, data.whatsapp),
    totalConversion: safeDivide(data.orders, data.views),
  };
}