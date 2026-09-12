import { describe, expect, it, vi } from 'vitest';
import {
  buildOrderDraft,
  listActiveProducts,
  prepareStoreOrder,
  type CatalogClient,
  type CatalogProduct,
  type CartSelection
} from '../src/services/catalogOrders';

const products: CatalogProduct[] = [
  {
    id: 'product-1',
    sku: 'LP-001',
    name: 'LifePhone Pro',
    wholesale_price: 100,
    stock_quantity: 10,
    is_active: true
  },
  {
    id: 'product-2',
    sku: 'LP-002',
    name: 'LifePhone Mini',
    wholesale_price: 55.5,
    stock_quantity: 3,
    is_active: true
  }
];

describe('Catalog and B2B order logic', () => {
  it('consulta únicamente productos activos', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ data: products, error: null })
    };
    query.select.mockReturnValue(query);
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as CatalogClient;

    await expect(listActiveProducts(client)).resolves.toEqual(products);
    expect(client.from).toHaveBeenCalledWith('products');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('arma el carrito, valida stock y calcula el total mayorista', () => {
    const selections: CartSelection[] = [
      { product_id: 'product-1', quantity: 2 },
      { product_id: 'product-2', quantity: 1 }
    ];

    expect(buildOrderDraft(products, selections)).toEqual({
      items: [
        { product_id: 'product-1', sku: 'LP-001', name: 'LifePhone Pro', quantity: 2, unit_price: 100, line_total: 200 },
        { product_id: 'product-2', sku: 'LP-002', name: 'LifePhone Mini', quantity: 1, unit_price: 55.5, line_total: 55.5 }
      ],
      total: 255.5
    });
  });

  it('rechaza cantidades invalidas, duplicados y stock insuficiente', () => {
    expect(() => buildOrderDraft(products, [])).toThrow('Cart cannot be empty');
    expect(() => buildOrderDraft(products, [{ product_id: 'product-1', quantity: 0 }])).toThrow('Quantity must be a positive integer');
    expect(() => buildOrderDraft(products, [
      { product_id: 'product-1', quantity: 1 },
      { product_id: 'product-1', quantity: 1 }
    ])).toThrow('Duplicate product');
    expect(() => buildOrderDraft(products, [{ product_id: 'product-2', quantity: 4 }])).toThrow('Insufficient stock');
  });

  it('prepara la estructura de store_orders y order_items', () => {
    const draft = buildOrderDraft(products, [{ product_id: 'product-1', quantity: 2 }]);

    expect(prepareStoreOrder('store-profile-1', draft, 'Entrega urgente')).toEqual({
      store_profile_id: 'store-profile-1',
      status: 'requested',
      notes: 'Entrega urgente',
      items: [{ product_id: 'product-1', quantity: 2, unit_price: 100 }],
      total: 200
    });
  });
});