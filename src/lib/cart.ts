export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
};

const CART_KEY_PREFIX = 'tiendasmart_cart_';

function getCartKey(storeSlug: string) {
  return `${CART_KEY_PREFIX}${storeSlug}`;
}

export function getCart(storeSlug: string): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getCartKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(storeSlug: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(getCartKey(storeSlug), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function addToCart(storeSlug: string, item: Omit<CartItem, 'quantity'>) {
  const cart = getCart(storeSlug);
  const existing = cart.find((p) => p.id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  saveCart(storeSlug, cart);
}

export function increaseCartItem(storeSlug: string, productId: string) {
  const cart = getCart(storeSlug);
  const item = cart.find((p) => p.id === productId);

  if (!item) return;

  item.quantity += 1;
  saveCart(storeSlug, cart);
}

export function decreaseCartItem(storeSlug: string, productId: string) {
  const cart = getCart(storeSlug);
  const item = cart.find((p) => p.id === productId);

  if (!item) return;

  item.quantity -= 1;

  const next = cart.filter((p) => p.quantity > 0);
  saveCart(storeSlug, next);
}

export function removeCartItem(storeSlug: string, productId: string) {
  const cart = getCart(storeSlug).filter((p) => p.id !== productId);
  saveCart(storeSlug, cart);
}

export function clearCart(storeSlug: string) {
  saveCart(storeSlug, []);
}

export function getCartCount(storeSlug: string) {
  return getCart(storeSlug).reduce((acc, item) => acc + item.quantity, 0);
}

export function getCartTotal(storeSlug: string) {
  return getCart(storeSlug).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildWhatsAppMessage(params: {
  storeName: string;
  storeSlug: string;
  items: CartItem[];
}) {
  const { storeName, storeSlug, items } = params;

  const lines = [
    `Hola! Quiero hacer un pedido en *${storeName}*`,
    '',
    '*Productos:*',
    ...items.map(
      (item) =>
        `- ${item.name} x${item.quantity} (${formatPrice(item.price)} c/u) = ${formatPrice(item.price * item.quantity)}`
    ),
    '',
    `*Total:* ${formatPrice(
      items.reduce((acc, item) => acc + item.price * item.quantity, 0)
    )}`,
    '',
    `Tienda: /${storeSlug}`,
  ];

  return lines.join('\n');
}

export function getWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}