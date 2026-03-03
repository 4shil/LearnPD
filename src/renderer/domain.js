export const computePlotDomain = (dist, params, zoom = 1) => {
  let xMin = dist.range.min;
  let xMax = dist.range.max;

  if (dist.autoScaleX && dist.isDiscrete) {
    const mean = dist.mean(params);
    const std = Math.sqrt(dist.variance(params)) || 1e-3;
    xMin = Math.max(dist.range.min, Math.floor(mean - 4 * std));
    xMax = Math.min(dist.range.max, Math.ceil(mean + 4 * std));
  }

  const zoomFactor = Math.max(0.2, zoom || 1);
  const center = (xMin + xMax) / 2;
  const halfRange = Math.max(1e-9, (xMax - xMin) / (2 * zoomFactor));

  return {
    xMin: center - halfRange,
    xMax: center + halfRange,
  };
};

export const computeYDomain = (dist, maxY) => {
  if (dist.fixedY) return dist.fixedY;
  if (dist.autoScaleY) return Math.max(0.001, maxY * 1.25);
  return 1.0;
};
