import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS } from '../../src/math/dist.js';

const defaultParams = (dist) => Object.fromEntries(dist.params.map((param) => [param.id, param.default]));

const sampleSupport = (dist, params) => {
  if (dist.isDiscrete) {
    const min = Number.isFinite(dist.range.min) ? Math.floor(dist.range.min) : 0;
    const max = Number.isFinite(dist.range.max) ? Math.ceil(dist.range.max) : min + 10;
    return Array.from({ length: Math.min(21, max - min + 1) }, (_, index) => min + index);
  }

  const min = Number.isFinite(dist.range.min) ? dist.range.min : 0;
  const max = Number.isFinite(dist.range.max) ? dist.range.max : min + 10;
  return [min, (min + max) / 2, max].filter((x) => Number.isFinite(x));
};

describe('probability distribution definitions', () => {
  it('defines finite default summary statistics for every distribution', () => {
    for (const [id, dist] of Object.entries(DISTRIBUTIONS)) {
      const params = defaultParams(dist);

      expect(Number.isFinite(dist.mean(params)), `${id} default mean`).toBe(true);
      expect(Number.isFinite(dist.variance(params)), `${id} default variance`).toBe(true);
      expect(Number.isFinite(dist.median(params)), `${id} default median`).toBe(true);
    }
  });

  it('returns bounded PMF values for discrete distributions at default parameters', () => {
    for (const [id, dist] of Object.entries(DISTRIBUTIONS).filter(([, dist]) => dist.isDiscrete)) {
      const params = defaultParams(dist);

      for (const x of sampleSupport(dist, params)) {
        const probability = dist.pmf(x, params);
        expect(Number.isFinite(probability), `${id} PMF at ${x}`).toBe(true);
        expect(probability, `${id} PMF lower bound at ${x}`).toBeGreaterThanOrEqual(0);
        expect(probability, `${id} PMF upper bound at ${x}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('returns finite non-negative PDF values for continuous distributions away from singular edges', () => {
    for (const [id, dist] of Object.entries(DISTRIBUTIONS).filter(([, dist]) => !dist.isDiscrete)) {
      const params = defaultParams(dist);
      const [min, midpoint, max] = sampleSupport(dist, params);
      const interior = [midpoint ?? min, min + (max - min) * 0.25, min + (max - min) * 0.75]
        .filter((x) => Number.isFinite(x));

      for (const x of interior) {
        const density = dist.pdf(x, params);
        expect(Number.isFinite(density), `${id} PDF at ${x}`).toBe(true);
        expect(density, `${id} PDF lower bound at ${x}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps CDF outputs inside probability bounds at default parameters', () => {
    for (const [id, dist] of Object.entries(DISTRIBUTIONS)) {
      const params = defaultParams(dist);

      for (const x of sampleSupport(dist, params)) {
        const cumulative = dist.cdf(x, params);
        expect(Number.isFinite(cumulative), `${id} CDF at ${x}`).toBe(true);
        expect(cumulative, `${id} CDF lower bound at ${x}`).toBeGreaterThanOrEqual(0);
        expect(cumulative, `${id} CDF upper bound at ${x}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('extra binomial bounds', () => { it('handles large trial inputs stably', () => { const bin = DISTRIBUTIONS.binomial; expect(Number.isFinite(bin.pmf(500, { n: 1000, p: 0.5 }))).toBe(true); }); });
describe('extra poisson bounds', () => { it('handles large rates stably', () => { const poi = DISTRIBUTIONS.poisson; expect(Number.isFinite(poi.pmf(200, { lambda: 180 }))).toBe(true); }); });
describe('extra studentt bounds', () => { it('handles low degrees of freedom variance stably', () => { const t = DISTRIBUTIONS.studentt; expect(t.variance({ df: 2 })).toBe(Infinity); }); });
describe('extra weibull bounds', () => { it('handles zero or negative scale stably', () => { const w = DISTRIBUTIONS.weibull; expect(Number.isFinite(w.pdf(1, { scale: 0, shape: 2 }))).toBe(false); }); });
describe('extra gamma bounds', () => { it('handles zero shape stably', () => { const g = DISTRIBUTIONS.gamma; expect(Number.isFinite(g.pdf(1, { shape: 0, scale: 2 }))).toBe(true); }); });
describe('extra beta bounds', () => { it('handles zero shapes stably', () => { const b = DISTRIBUTIONS.beta; expect(Number.isFinite(b.pdf(0.5, { alpha: 0, beta: 0 }))).toBe(true); }); });
describe('extra lognormal bounds', () => { it('handles zero scale stably', () => { const ln = DISTRIBUTIONS.lognormal; expect(Number.isFinite(ln.pdf(1, { mu: 0, sigma: 0 }))).toBe(true); }); });
describe('extra chisquare bounds', () => { it('handles zero df stably', () => { const chi = DISTRIBUTIONS.chisquare; expect(Number.isFinite(chi.pdf(1, { df: 0 }))).toBe(true); }); });