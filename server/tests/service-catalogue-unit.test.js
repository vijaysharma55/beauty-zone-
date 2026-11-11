/**
 * Service catalogue vocabulary: presets, custom categories, subcategories and
 * the category → subcategory grouping used by the management page.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SERVICE_CATEGORY,
  MAX_SERVICE_CATEGORY_LENGTH,
  SERVICE_CATEGORY_PRESETS,
  dedupeLabels,
  findServiceCategoryPreset,
  groupServicesByCategory,
  normalizeServiceCategory,
  normalizeServiceSubcategory,
  serviceCategoryLabel,
  serviceCategoryOptions,
  serviceSubcategoryLabel,
  suggestedSubcategories,
} from '../../src/lib/serviceCategories.js';

test('preset categories collapse to their canonical key, custom ones are preserved', () => {
  assert.equal(normalizeServiceCategory('Hair'), 'hair');
  assert.equal(normalizeServiceCategory('  NAILS '), 'nails');
  assert.equal(normalizeServiceCategory('makeup'), 'makeup');
  assert.equal(normalizeServiceCategory('Piercing'), 'Piercing');
  assert.equal(normalizeServiceCategory('  Bridal   Party  '), 'Bridal Party');
  assert.equal(normalizeServiceCategory(''), '');
  assert.equal(normalizeServiceCategory(null), '');
});

test('custom categories never silently collapse into a preset key', () => {
  // A hair *sub-brand* is its own category, not the preset "hair".
  assert.equal(normalizeServiceCategory('Hair Extensions'), 'Hair Extensions');
  assert.equal(serviceCategoryLabel('Hair Extensions'), 'Hair Extensions');
  assert.equal(findServiceCategoryPreset('Hair Extensions'), null);
  assert.equal(serviceCategoryLabel('hair'), 'Hair');
  assert.equal(findServiceCategoryPreset('HAIR')?.value, 'hair');
});

test('category labels are safe and human readable', () => {
  assert.equal(serviceCategoryLabel(''), 'Uncategorised');
  assert.equal(serviceCategoryLabel('nails'), 'Nails');
  assert.equal(serviceCategoryLabel('academy'), 'Academy');
  assert.equal(serviceCategoryLabel('piercing'), 'Piercing');
  assert.equal(serviceSubcategoryLabel(''), 'General');
  assert.equal(serviceSubcategoryLabel('Gel Nails'), 'Gel Nails');
});

test('subcategories keep the official preset spelling regardless of case', () => {
  const nails = suggestedSubcategories('nails');
  assert.ok(nails.includes('Gel Nails'));
  assert.ok(nails.includes('Acrylic Nails'));
  assert.equal(normalizeServiceSubcategory('gel nails'), 'Gel Nails');
  assert.equal(normalizeServiceSubcategory('  ACRYLIC   NAILS '), 'Acrylic Nails');
  assert.equal(normalizeServiceSubcategory('Chrome Fade'), 'Chrome Fade');
  assert.equal(normalizeServiceSubcategory(''), '');
  // Custom categories have no suggestions until the owner adds services.
  assert.deepEqual(suggestedSubcategories('Piercing'), []);
});

test('category names are capped to a sane length and reject control characters', () => {
  const long = 'A'.repeat(MAX_SERVICE_CATEGORY_LENGTH + 40);
  assert.equal(normalizeServiceCategory(long).length, MAX_SERVICE_CATEGORY_LENGTH);
  assert.equal(normalizeServiceCategory('Wellness\u0000\u0007Spa'), 'Wellness Spa');
});

test('services are grouped by category then subcategory, presets first', () => {
  const services = [
    { id: '1', name: 'Gel Set', category: 'nails', subcategory: 'Gel Nails', active: true },
    { id: '2', name: 'Acrylic Set', category: 'nails', subcategory: 'Acrylic Nails', active: false },
    { id: '3', name: 'Refill', category: 'nails', subcategory: 'gel nails', active: true },
    { id: '4', name: 'Signature Cut', category: 'hair', subcategory: '', active: true },
    { id: '5', name: 'Nostril Piercing', category: 'Piercing', subcategory: '', active: true },
  ];

  const groups = groupServicesByCategory(services);
  assert.deepEqual(groups.map((group) => group.category), ['hair', 'nails', 'Piercing']);

  const nails = groups.find((group) => group.category === 'nails');
  assert.equal(nails?.label, 'Nails');
  assert.equal(nails?.total, 3);
  assert.equal(nails?.active, 2, 'inactive services are counted but flagged');

  // "gel nails" and "Gel Nails" are the same bucket; suggestions come first.
  assert.deepEqual(nails?.subcategories.map((bucket) => bucket.subcategory), ['Gel Nails', 'Acrylic Nails']);
  assert.deepEqual(nails?.subcategories[0].services.map((service) => service.id), ['1', '3']);
  assert.equal(nails?.subcategories[0].total, 2);

  const hair = groups.find((group) => group.category === 'hair');
  assert.equal(hair?.subcategories[0].subcategory, '');
  assert.equal(hair?.subcategories[0].label, 'General');

  const custom = groups.find((group) => group.category === 'Piercing');
  assert.equal(custom?.label, 'Piercing');
});

test('grouping tolerates empty catalogues and legacy rows without a subcategory', () => {
  assert.deepEqual(groupServicesByCategory([]), []);
  assert.deepEqual(groupServicesByCategory(null), []);
  const groups = groupServicesByCategory([{ id: 'x', name: 'Legacy', category: 'skin' }]);
  assert.equal(groups[0].category, 'skin');
  assert.equal(groups[0].subcategories[0].subcategory, '');
  assert.equal(groups[0].active, 1, 'a missing active flag counts as visible');
});

test('custom categories sort after presets and are de-duplicated', () => {
  const services = [
    { id: '1', category: 'Zebra Studio' },
    { id: '2', category: 'ancillary' },
    { id: '3', category: 'spa' },
    { id: '4', category: 'hair' },
  ];
  assert.deepEqual(
    groupServicesByCategory(services).map((group) => group.category),
    ['hair', 'spa', 'ancillary', 'Zebra Studio']
  );
});

test('category options merge presets with categories and subcategories in use', () => {
  const services = [
    { id: '1', category: 'nails', subcategory: 'Press-On Nails' },
    { id: '2', category: 'Piercing', subcategory: 'Ear Lobe' },
  ];
  const options = serviceCategoryOptions(services);
  const nails = options.find((option) => option.value === 'nails');
  assert.equal(nails?.custom, false);
  assert.ok(nails?.subcategories.includes('Gel Nails'), 'preset suggestions are offered');
  assert.ok(nails?.subcategories.includes('Press-On Nails'), 'subcategories already in use are offered');

  const piercing = options.find((option) => option.value === 'Piercing');
  assert.equal(piercing?.custom, true);
  assert.deepEqual(piercing?.subcategories, ['Ear Lobe']);

  // Every preset is present so a fresh catalogue can be built from them.
  for (const preset of SERVICE_CATEGORY_PRESETS) {
    assert.ok(options.some((option) => option.value === preset.value), preset.value);
  }
  assert.equal(DEFAULT_SERVICE_CATEGORY, 'other');
});

test('classes added in this session stay selectable before any service uses them', () => {
  const options = serviceCategoryOptions([], ['Bridal Party']);
  const custom = options.find((option) => option.value === 'Bridal Party');
  assert.equal(custom?.custom, true);
  assert.deepEqual(custom?.subcategories, []);
});

test('dedupeLabels is case-insensitive and keeps the first spelling', () => {
  assert.deepEqual(dedupeLabels(['Gel Nails', 'gel nails', 'GEL NAILS', 'Acrylic Nails']), [
    'Gel Nails',
    'Acrylic Nails',
  ]);
  assert.deepEqual(dedupeLabels(null), []);
});
