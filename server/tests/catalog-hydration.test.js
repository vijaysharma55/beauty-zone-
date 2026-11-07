/** Owner data/pricing preservation + cloud cache reconciliation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  preserveNumber, hydrateDescription, hydrateEditorial, hydrateServiceItem,
  hydratePackageItem, mergeCatalogs, sanitizeCatalog, catalogsEqual,
  serviceHasPricing, packageHasPricing, MAX_CATALOG_ITEMS,
} from '../../src/data/catalogHydration.js';

const editorial = {
  processSteps: ['Consultation', 'Treatment', 'Finish'],
  benefits: ['Long-lasting glow'],
  idealFor: 'All skin types',
  productsUsed: ['MAC', 'Olaplex'],
  priceNote: 'Inclusive of consultation.',
  description: 'A '.repeat(120) + 'full luxury protocol with genuine professional products.',
};

const masterService = {
  id: 'b1', title: 'Canonical Bridal', category: 'bridal', price: 24999,
  duration: '180 mins', description: editorial.description,
  highlights: ['HD finish'], image: '/images/canonical.jpg', ...editorial,
};

const fallbackService = { ...editorial, description: 'Generated fallback description '.repeat(10) };

function customService(overrides = {}) {
  return {
    id: 'custom-1', title: 'Owner Signature Ritual', category: 'skin',
    price: 0, duration: '45 mins', description: 'Our own handwritten note.',
    highlights: ['Owner highlight'], image: 'data:image/png;base64,AAAA', ...overrides,
  };
}

test('preserveNumber keeps a deliberate zero and rejects only invalid values', () => {
  assert.equal(preserveNumber(0, 9999), 0);
  assert.equal(preserveNumber(1250, 9999), 1250);
  assert.equal(preserveNumber('499', 9999), 499);
  assert.equal(preserveNumber(null, 9999), 9999);
  assert.equal(preserveNumber(undefined, 9999), 9999);
  assert.equal(preserveNumber(-5, 9999), 9999);
  assert.equal(preserveNumber(NaN, 9999), 9999);
  assert.equal(preserveNumber(null, null), 0);
});

test('hydrateDescription never blanks or overwrites genuine owner copy', () => {
  const canonical = 'A '.repeat(120) + 'canonical luxury protocol.';
  assert.equal(hydrateDescription('', canonical), canonical);
  assert.equal(hydrateDescription('Confirm with salon', canonical), canonical);
  assert.equal(hydrateDescription('Please confirm availability with the salon', canonical), canonical);
  const long = 'x'.repeat(260);
  assert.equal(hydrateDescription(long, canonical), long);
  const short = 'Handwritten owner note.';
  const joined = hydrateDescription(short, canonical);
  assert.ok(joined.startsWith(short), 'owner words must be preserved verbatim');
  assert.ok(joined.includes(canonical), 'short copy must be enriched');
  assert.equal(hydrateDescription(canonical, canonical), canonical);
});

test('hydrateEditorial only fills missing fields', () => {
  const result = hydrateEditorial(
    { benefits: ['Owner benefit'], priceNote: 'Owner price note' },
    { benefits: ['Canonical'], processSteps: ['Step'], idealFor: 'Canonical type' },
    editorial
  );
  assert.deepEqual(result.benefits, ['Owner benefit']);
  assert.equal(result.priceNote, 'Owner price note');
  assert.deepEqual(result.processSteps, ['Step']);
  assert.equal(result.idealFor, 'Canonical type');
  assert.deepEqual(result.productsUsed, ['MAC', 'Olaplex']);
});

test('service hydration preserves custom price 0, title, image and short owner text', () => {
  const input = customService();
  const snapshot = JSON.stringify(input);
  const result = hydrateServiceItem(input, null, fallbackService);
  assert.equal(JSON.stringify(input), snapshot, 'input must not be mutated');
  assert.equal(result.price, 0);
  assert.equal(result.title, 'Owner Signature Ritual');
  assert.equal(result.image, 'data:image/png;base64,AAAA');
  assert.equal(result.duration, '45 mins');
  assert.ok(result.description.startsWith('Our own handwritten note.'));
  assert.ok(result.description.length > 200, 'short card copy must be enriched');
  assert.deepEqual(result.processSteps, fallbackService.processSteps);
  assert.equal(serviceHasPricing(result), false);
});

test('canonical service keeps its published price and non-blank description', () => {
  const stale = { ...masterService, description: '', price: null, processSteps: [] };
  const result = hydrateServiceItem(stale, masterService, fallbackService);
  assert.equal(result.price, 24999);
  assert.equal(result.description, masterService.description);
  assert.deepEqual(result.processSteps, masterService.processSteps);
  assert.equal(serviceHasPricing(result), true);
});

test('package hydration preserves custom prices and does not fabricate pricing', () => {
  const custom = {
    id: 'pkg-custom', name: 'Owner Combo', description: 'Owner written combo.',
    services: ['Facial'], duration: '90 mins',
    regular_price: 0, package_price: 0, discount: 0, savings: 0,
    validity: '30 Days', outlets: ['Jaipur'], usage_rules: ['One visit'],
    image: 'data:image/png;base64,BBBB',
  };
  const result = hydratePackageItem(custom, null, editorial);
  assert.equal(result.regular_price, 0);
  assert.equal(result.package_price, 0);
  assert.equal(result.savings, 0);
  assert.equal(result.discount, 0);
  assert.equal(result.image, 'data:image/png;base64,BBBB');
  assert.ok(result.description.startsWith('Owner written combo.'));
  assert.equal(packageHasPricing(result), false);
});

test('package hydration recalculates inconsistent derived savings only', () => {
  const pkg = {
    id: 'p1', name: 'Package', description: 'Long '.repeat(60),
    regular_price: 10000, package_price: 8000, savings: 0, discount: 0,
    validity: '60 Days', outlets: ['All'], usage_rules: ['One visit'], image: '/x.jpg',
  };
  const result = hydratePackageItem(pkg, null, editorial);
  assert.equal(result.savings, 2000);
  assert.equal(result.discount, 20);
  const stable = hydratePackageItem(result, null, editorial);
  assert.equal(stable.savings, 2000);
  assert.equal(stable.discount, 20);
});

test('mergeCatalogs keeps local-only custom cards and repairs blank cloud fields', () => {
  const cloud = [
    { id: 'b1', title: 'Cloud Bridal', price: 24999, description: '' },
  ];
  const local = [
    { id: 'b1', title: '', price: 0, description: 'Saved owner description.', image: '/local.jpg' },
    { id: 'custom-9', title: 'Only local', price: 0, description: 'Custom card.' },
  ];
  const snapshot = JSON.stringify({ cloud, local });
  const merged = mergeCatalogs(cloud, local);
  assert.equal(JSON.stringify({ cloud, local }), snapshot, 'inputs must not be mutated');
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, 'Cloud Bridal', 'non-empty cloud value wins');
  assert.equal(merged[0].price, 24999, 'non-empty cloud price wins');
  assert.equal(merged[0].description, 'Saved owner description.', 'blank cloud field is repaired');
  assert.equal(merged[0].image, '/local.jpg');
  assert.equal(merged[1].id, 'custom-9', 'local-only custom card survives');
});

test('sanitizeCatalog drops junk, deduplicates ids and caps size', () => {
  const junk = [null, 42, { id: '' }, { id: 'a' }, { id: 'a' }, { id: 'b' }];
  assert.deepEqual(sanitizeCatalog(junk).map((item) => item.id), ['a', 'b']);
  const huge = Array.from({ length: MAX_CATALOG_ITEMS + 50 }, (_, i) => ({ id: `x${i}` }));
  assert.equal(sanitizeCatalog(huge).length, MAX_CATALOG_ITEMS);
  assert.deepEqual(sanitizeCatalog('not an array'), []);
});

test('catalogsEqual avoids unnecessary localStorage writes', () => {
  assert.equal(catalogsEqual([{ id: 'a' }], [{ id: 'a' }]), true);
  assert.equal(catalogsEqual([{ id: 'a' }], [{ id: 'b' }]), false);
  assert.equal(catalogsEqual(null, []), false);
});
