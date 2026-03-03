import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Renderer } from '../../src/renderer/canvas.js';
import { DISTRIBUTIONS } from '../../src/math/dist.js';

const createContext = () => ({
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fill: vi.fn(),
  fillText: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  roundRect: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
});

const installCanvas = ({ width = 640, height = 360 } = {}) => {
  const context = createContext();
  const parentElement = {
    getBoundingClientRect: vi.fn(() => ({ width, height })),
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    parentElement,
    getContext: vi.fn(() => context),
  };

  globalThis.window = { devicePixelRatio: 2 };
  globalThis.document = {
    getElementById: vi.fn((id) => (id === 'chart' ? canvas : null)),
  };

  return { canvas, context, parentElement };
};

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.document;
  delete globalThis.window;
});

describe('Renderer', () => {
  beforeEach(() => {
    installCanvas();
  });

  it('sizes the canvas backing store for the device pixel ratio without stacking transforms', () => {
    const { canvas, context } = installCanvas({ width: 320, height: 180 });

    const renderer = new Renderer('chart');
    renderer.resize();

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(canvas.style.width).toBe('320px');
    expect(canvas.style.height).toBe('180px');
    expect(context.scale).not.toHaveBeenCalled();
    expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('caches the plotted domain and y-scale for tooltip mapping', () => {
    const renderer = new Renderer('chart');
    const normal = DISTRIBUTIONS.normal;

    const result = renderer.plotDistribution(normal, { mu: 0, sigma: 1 }, false, false, 1);

    expect(result.xMin).toBe(normal.range.min);
    expect(result.xMax).toBe(normal.range.max);
    expect(renderer.xMin).toBe(result.xMin);
    expect(renderer.xMax).toBe(result.xMax);
    expect(renderer.maxY).toBe(result.maxY);
  });

  it('skips plotting when the canvas has no drawable plot area', () => {
    installCanvas({ width: 0, height: 0 });
    const renderer = new Renderer('chart');

    expect(renderer.plotDistribution(DISTRIBUTIONS.normal, { mu: 0, sigma: 1 })).toBeNull();
  });

  it('filters singular continuous PDF points before drawing curves', () => {
    const renderer = new Renderer('chart');

    const betaResult = renderer.plotDistribution(DISTRIBUTIONS.beta, { alpha: 0.5, beta: 0.5 });
    const weibullResult = renderer.plotDistribution(DISTRIBUTIONS.weibull, { scale: 1, shape: 0.5 });

    expect(betaResult.points.every((point) => Number.isFinite(point.y))).toBe(true);
    expect(weibullResult.points.every((point) => Number.isFinite(point.y))).toBe(true);
  });

  it('narrows the plot domain around the same center when zooming in', () => {
    const renderer = new Renderer('chart');

    const normal = renderer.plotDistribution(DISTRIBUTIONS.normal, { mu: 0, sigma: 1 }, false, false, 1);
    const zoomed = renderer.plotDistribution(DISTRIBUTIONS.normal, { mu: 0, sigma: 1 }, false, false, 2);

    expect((zoomed.xMin + zoomed.xMax) / 2).toBeCloseTo((normal.xMin + normal.xMax) / 2);
    expect(zoomed.xMax - zoomed.xMin).toBeLessThan(normal.xMax - normal.xMin);
  });

  it('keeps discrete bars inside a finite render domain', () => {
    const renderer = new Renderer('chart');
    const binomial = DISTRIBUTIONS.binomial;

    const result = renderer.plotDistribution(binomial, { n: 20, p: 0.5 }, false, false, 1);

    expect(Number.isFinite(result.xMin)).toBe(true);
    expect(Number.isFinite(result.xMax)).toBe(true);
    expect(result.xMin).toBeLessThan(result.xMax);
    expect(result.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });
});
