import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS } from '../../src/math/dist.js';
import { computeMergedPlotDomain, computePlotDomain, computeYDomain } from '../../src/renderer/domain.js';

describe('chart domain utilities', () => {
  it('keeps continuous zoom centered on the base range', () => {
    const normal = DISTRIBUTIONS.normal;
    const base = computePlotDomain(normal, { mu: 0, sigma: 1 }, 1);
    const zoomed = computePlotDomain(normal, { mu: 0, sigma: 1 }, 2);

    expect((zoomed.xMin + zoomed.xMax) / 2).toBeCloseTo((base.xMin + base.xMax) / 2);
    expect(zoomed.xMax - zoomed.xMin).toBeCloseTo((base.xMax - base.xMin) / 2);
  });

  it('auto-scales discrete domains around their mean and variance', () => {
    const poisson = DISTRIBUTIONS.poisson;
    const domain = computePlotDomain(poisson, { lambda: 30 }, 1);

    expect(domain.xMin).toBeGreaterThanOrEqual(poisson.range.min);
    expect(domain.xMax).toBeLessThanOrEqual(poisson.range.max);
    expect(domain.xMin).toBeLessThan(30);
    expect(domain.xMax).toBeGreaterThan(30);
  });

  it('merges comparison domains so both distributions fit on one x-axis', () => {
    const merged = computeMergedPlotDomain([
      { dist: DISTRIBUTIONS.normal, params: { mu: 0, sigma: 1 } },
      { dist: DISTRIBUTIONS.poisson, params: { lambda: 30 } },
    ], 1);
    const normal = computePlotDomain(DISTRIBUTIONS.normal, { mu: 0, sigma: 1 }, 1);
    const poisson = computePlotDomain(DISTRIBUTIONS.poisson, { lambda: 30 }, 1);

    expect(merged.xMin).toBeLessThanOrEqual(normal.xMin);
    expect(merged.xMin).toBeLessThanOrEqual(poisson.xMin);
    expect(merged.xMax).toBeGreaterThanOrEqual(normal.xMax);
    expect(merged.xMax).toBeGreaterThanOrEqual(poisson.xMax);
  });

  it('applies fixed and auto y-domain policies consistently', () => {
    expect(computeYDomain(DISTRIBUTIONS.normal, 0.42)).toBe(DISTRIBUTIONS.normal.fixedY);
    expect(computeYDomain(DISTRIBUTIONS.beta, 2)).toBe(DISTRIBUTIONS.beta.fixedY);
    expect(computeYDomain(DISTRIBUTIONS.uniform, 0.42)).toBe(DISTRIBUTIONS.uniform.fixedY);
  });
});
