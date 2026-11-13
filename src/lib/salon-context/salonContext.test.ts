import { describe, expect, it } from 'vitest';
import { detectSalonDomain } from './detectSalonDomain';
import { rankTemplates } from './rankServices';

describe('detectSalonDomain', () => {
  it('detects a nail-focused salon from its name', () => {
    expect(detectSalonDomain({ name: 'Uma Nails' }).primaryDomain).toBe('nails');
  });

  it('keeps hair primary and skin secondary for a mixed beauty studio', () => {
    const result = detectSalonDomain({ name: 'Glow Hair & Beauty Studio' });
    expect(result.primaryDomain).toBe('hair');
    expect(result.secondaryDomains).toContain('skin');
  });

  it('detects a gents salon as barber rather than generic hair', () => {
    expect(detectSalonDomain({ name: 'Royal Gents Salon' }).primaryDomain).toBe('barber');
  });

  it('falls back safely for an empty profile', () => {
    expect(detectSalonDomain({}).primaryDomain).toBe('unisex_general');
  });

  it('lets repeated existing service history outweigh a weak name signal', () => {
    const result = detectSalonDomain({
      name: 'Uma Beauty',
      existingServices: [
        { name: 'Keratin Treatment', category: 'hair' },
        { name: 'Hair Spa', category: 'hair' },
        { name: 'Global Hair Colour', category: 'hair' },
      ],
    });
    expect(result.primaryDomain).toBe('hair');
  });
});

describe('rankTemplates', () => {
  it('does not recommend a service that the salon already has', () => {
    const results = rankTemplates({
      name: 'Uma Nails',
      detection: detectSalonDomain({ name: 'Uma Nails' }),
      existingServices: [{ name: 'Gel Polish', category: 'nails', subcategory: 'Gel Nails' }],
    });
    expect(results.some((item) => item.id === 'gel-polish')).toBe(false);
    expect(results[0].domain).toBe('nails');
  });

  it('searches templates across domains while preserving salon relevance', () => {
    const results = rankTemplates({
      name: 'Uma Nails',
      detection: detectSalonDomain({ name: 'Uma Nails' }),
    }, { query: 'haircut' });
    expect(results.some((item) => item.id === 'women-haircut')).toBe(true);
  });
});
