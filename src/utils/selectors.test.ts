import { describe, expect, it } from 'vitest';
import {
  cardQuantity,
  groupByCategory,
  isProductSelected,
  selectedCountForStep,
  selectedLineItems,
} from './selectors';
import { getProduct } from '../data/catalog';
import type { Product } from '../types';

function mustGet(id: string): Product {
  const product = getProduct(id);
  if (!product) throw new Error(`missing product ${id}`);
  return product;
}

describe('selectedLineItems', () => {
  it('returns one line per selected (product, variant) pair with line totals', () => {
    const items = selectedLineItems({
      'wyze-cam-v4:white': 2,
      'wyze-cam-v4:black': 1,
      'wyze-microsd-256gb': 2,
    });
    expect(items.map((i) => i.lineItemId)).toEqual([
      'wyze-cam-v4:white',
      'wyze-cam-v4:black',
      'wyze-microsd-256gb',
    ]);
    expect(items[0]?.variant?.name).toBe('White');
    expect(items[1]?.variant?.name).toBe('Black');
    expect(items[0]?.lineTotal).toBe(2 * 2798);
    expect(items[2]?.lineTotal).toBe(2 * 2098);
  });

  it('omits zero-quantity and unknown lines', () => {
    const items = selectedLineItems({ 'wyze-cam-v4:white': 0, ghost: 4 });
    expect(items).toHaveLength(0);
  });

  it('keeps catalog order regardless of insertion order', () => {
    const items = selectedLineItems({
      'wyze-microsd-256gb': 1,
      'wyze-cam-v4:white': 1,
      'cam-unlimited': 1,
    });
    expect(items.map((i) => i.product.id)).toEqual([
      'wyze-cam-v4',
      'cam-unlimited',
      'wyze-microsd-256gb',
    ]);
  });
});

describe('groupByCategory', () => {
  it('groups in review order (cameras, sensors, accessories, plan) and hides empty groups', () => {
    const groups = groupByCategory(
      selectedLineItems({
        'cam-unlimited': 1,
        'wyze-cam-v4:white': 1,
        'wyze-sense-hub': 1,
      }),
    );
    expect(groups.map((g) => g.category)).toEqual(['cameras', 'sensors', 'plan']);
  });
});

describe('selectedCountForStep', () => {
  it('counts distinct products, not quantities or variant lines', () => {
    const quantities = {
      'wyze-cam-v4:white': 2,
      'wyze-cam-v4:black': 3,
      'wyze-cam-pan-v3:white': 2,
    };
    // Two distinct cameras selected even though 7 units across 3 lines.
    expect(selectedCountForStep('cameras', quantities)).toBe(2);
    expect(selectedCountForStep('sensors', quantities)).toBe(0);
  });
});

describe('cardQuantity / isProductSelected', () => {
  it('reads the quantity of the card-active variant only', () => {
    const camV4 = mustGet('wyze-cam-v4');
    const quantities = { 'wyze-cam-v4:white': 2, 'wyze-cam-v4:black': 5 };
    expect(cardQuantity(camV4, 'white', quantities)).toBe(2);
    expect(cardQuantity(camV4, 'black', quantities)).toBe(5);
    expect(cardQuantity(camV4, 'grey', quantities)).toBe(0);
  });

  it('treats a product as selected when any variant line is > 0', () => {
    const camV4 = mustGet('wyze-cam-v4');
    expect(isProductSelected(camV4, { 'wyze-cam-v4:grey': 1 })).toBe(true);
    expect(isProductSelected(camV4, {})).toBe(false);
    const doorbell = mustGet('wyze-duo-cam-doorbell');
    expect(isProductSelected(doorbell, { 'wyze-duo-cam-doorbell': 1 })).toBe(true);
  });
});
