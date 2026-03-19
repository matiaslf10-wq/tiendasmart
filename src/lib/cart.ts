import { canPurchase, getMaxPurchasableQuantity } from '@/lib/stock';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  is_active?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  allow_backorder?: boolean | null;
};

const CART_KEY_PREFIX = 'tiendasmart_cart_';

function getCartKey(storeSlug: string) {
  return `${CART_KEY_PREFIX}${storeSlug}`;
}

function sanitizeCart(items: CartItem[]): CartItem[] {
  return items
    .filter((item) => !!item?.id)
    .filter((item) => canPurchase(item))
    .map((item) => {
      const maxQty = getMaxPurchasableQuantity(item);
      const normalizedQuantity = Math.max(
        1,
        Math.min(item.quantity ?? 1, maxQty)
      );

      return {
        ...item,
        quantity: normalizedQuantity,
      };
    })
    .filter((item) => item.quantity > 0);
}

export function getCart(storeSlug: string): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getCartKey(storeSlug));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CartItem[];
    const safeItems = Array.isArray(parsed) ? sanitizeCart(parsed) : [];

    if (JSON.stringify(parsed) !== JSON.stringify(safeItems)) {
      localStorage.setItem(getCartKey(storeSlug), JSON.stringify(safeItems));
    }

    return safeItems;
  } catch {
    return [];
  }
}

export function saveCart(storeSlug: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;

  const safeItems = sanitizeCart(items);
  localStorage.setItem(getCartKey(storeSlug), JSON.stringify(safeItems));
  window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function addToCart(
  storeSlug: string,
  item: Omit<CartItem, 'quantity'>,
  quantity = 1
) {
  const cart = getCart(storeSlug);

  if (!canPurchase(item)) return;

  const existing = cart.find((p) => p.id === item.id);
  const maxQty = getMaxPurchasableQuantity(item);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, maxQty);
  } else {
    const initialQty = Math.min(Math.max(quantity, 1), maxQty);

    if (initialQty <= 0) return;

    cart.push({ ...item, quantity: initialQty });
  }

  saveCart(storeSlug, cart);
}

export function increaseCartItem(storeSlug: string, productId: string) {
  const cart = getCart(storeSlug);
  const item = cart.find((p) => p.id === productId);

  if (!item) return;

  const maxQty = getMaxPurchasableQuantity(item);
  item.quantity = Math.min(item.quantity + 1, maxQty);

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

const CUSTOMER_KEY_PREFIX = 'tiendasmart_customer_';

function getCustomerKey(storeSlug: string) {
  return `${CUSTOMER_KEY_PREFIX}${storeSlug}`;
}

export type CustomerData = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export function getCustomerData(storeSlug: string): CustomerData {
  if (typeof window === 'undefined') {
    return { name: '', phone: '', address: '', notes: '' };
  }

  try {
    const raw = localStorage.getItem(getCustomerKey(storeSlug));
    if (!raw) return { name: '', phone: '', address: '', notes: '' };

    const parsed = JSON.parse(raw) as Partial<CustomerData>;

    return {
      name: parsed.name ?? '',
      phone: parsed.phone ?? '',
      address: parsed.address ?? '',
      notes: parsed.notes ?? '',
    };
  } catch {
    return { name: '', phone: '', address: '', notes: '' };
  }
}

export function saveCustomerData(storeSlug: string, data: CustomerData) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(getCustomerKey(storeSlug), JSON.stringify(data));
}