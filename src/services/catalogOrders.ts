import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

export type CatalogClient = Pick<SupabaseClient<Database>, 'from'>;

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  wholesale_price: number;
  stock_quantity: number;
  is_active: boolean;
};

export type CartSelection = {
  product_id: string;
  quantity: number;
};

export type OrderDraftItem = {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type OrderDraft = {
  items: OrderDraftItem[];
  total: number;
};

export type PreparedStoreOrder = {
  store_profile_id: string;
  status: 'requested';
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  total: number;
};

export async function listActiveProducts(client: CatalogClient) {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('is_active', true);
  if (error) {
    throw error;
  }
  return data;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildOrderDraft(
  products: CatalogProduct[],
  selections: CartSelection[]
): OrderDraft {
  if (selections.length === 0) {
    throw new Error('Cart cannot be empty');
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const selectedProductIds = new Set<string>();
  const items = selections.map((selection) => {
    if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (selectedProductIds.has(selection.product_id)) {
      throw new Error(`Duplicate product: ${selection.product_id}`);
    }
    selectedProductIds.add(selection.product_id);

    const product = productById.get(selection.product_id);
    if (!product || !product.is_active) {
      throw new Error(`Product unavailable: ${selection.product_id}`);
    }
    if (selection.quantity > product.stock_quantity) {
      throw new Error(`Insufficient stock: ${selection.product_id}`);
    }

    const lineTotal = roundCurrency(product.wholesale_price * selection.quantity);
    return {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: selection.quantity,
      unit_price: product.wholesale_price,
      line_total: lineTotal
    };
  });

  return {
    items,
    total: roundCurrency(items.reduce((total, item) => total + item.line_total, 0))
  };
}

export function prepareStoreOrder(
  storeProfileId: string,
  draft: OrderDraft,
  notes?: string
): PreparedStoreOrder {
  if (!storeProfileId.trim()) {
    throw new Error('Store profile is required');
  }

  return {
    store_profile_id: storeProfileId,
    status: 'requested',
    ...(notes ? { notes } : {}),
    items: draft.items.map(({ product_id, quantity, unit_price }) => ({
      product_id,
      quantity,
      unit_price
    })),
    total: draft.total
  };
}