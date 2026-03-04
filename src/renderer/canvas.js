/**
 * Canvas Renderer — Clean, responsive plotting.
 * Supports high-DPI scaling, grids, distributions, relative frequency histograms,
 * quiz targets, and line paths for LLN simulations.
 */

import { computePlotDomain, computeYDomain } from './domain.js';

export class Renderer {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.options = {
            padding: 50,
            accent: '#c8f542',
            fg: '#1a1a1a',
            grid: '#e8e3dd',
            lineWidth: 2.5,
            ...options
        };
        
        // Cache rendering coordinates for tooltip mapping
        this.xMin = -5;
        this.xMax = 5;
        this.maxY = 1.0;
        
        this.resize();
        this.setupResizeObserver();
    }

    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined' && this.canvas && this.canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.resize()) {
                    if (this.options.onResize) {
                        this.options.onResize();
                    }
                }
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    resize() {
        if (!this.canvas || !this.ctx) return false;
        const parent = this.canvas.parentElement;
        const rect = parent?.getBoundingClientRect?.();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect?.width || 0));
        const height = Math.max(1, Math.floor(rect?.height || 0));

        // Skip resizing if parent size is essentially 0 (e.g. element is hidden)
        // to prevent collapsing the canvas permanently to 1x1.
        if (width <= 1 || height <= 1) {
            return false;
        }

        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = width;
        this.height = height;

        return true;
    }

    getPlotBounds() {
        const padding = Math.min(this.options.padding, Math.max(8, Math.floor(Math.min(this.width, this.height) / 4)));
        const plotWidth = this.width - 2 * padding;
        const plotHeight = this.height - 2 * padding;

        return {
            padding,
            plotWidth,
            plotHeight,
            drawable: Number.isFinite(plotWidth) && Number.isFinite(plotHeight) && plotWidth > 0 && plotHeight > 0
        };
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawGrid(zoom = 1.0) {
        if (!this.ctx) return;
        const { padding, grid } = this.options;
        this.ctx.strokeStyle = grid;
        this.ctx.lineWidth = 1;
        const plotW = this.width - 2 * padding;
        const plotH = this.height - 2 * padding;

        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = padding + (i / 10) * plotW;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, padding + plotH);
            this.ctx.stroke();
        }
        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i / 5) * plotH;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(padding + plotW, y);
            this.ctx.stroke();
        }
    }

    drawAxes(xMinVal = null, xMaxVal = null, yMaxVal = null) {
        if (!this.ctx) return;
        const { padding, fg } = this.options;
        this.ctx.strokeStyle = fg;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding - 10);
        this.ctx.lineTo(padding, this.height - padding);
        this.ctx.lineTo(this.width - padding + 10, this.height - padding);
        this.ctx.stroke();

        // Draw axis labels if bounds are provided
        if (xMinVal !== null && xMaxVal !== null) {
            this.ctx.fillStyle = fg;
            this.ctx.font = "bold 9px 'JetBrains Mono', monospace";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "top";
            
            // X Ticks
            const steps = 5;
            for (let i = 0; i <= steps; i++) {
                const val = xMinVal + (i / steps) * (xMaxVal - xMinVal);
                const cx = padding + (i / steps) * (this.width - 2 * padding);
                this.ctx.fillText(val.toFixed(1), cx, this.height - padding + 8);
            }
            
            // Y Ticks
            if (yMaxVal !== null) {
                this.ctx.textAlign = "right";
                this.ctx.textBaseline = "middle";
                const ySteps = 4;
                for (let i = 0; i <= ySteps; i++) {
                    const val = (i / ySteps) * yMaxVal;
                    const cy = this.height - padding - (i / ySteps) * (this.height - 2 * padding);
                    this.ctx.fillText(val.toFixed(2), padding - 8, cy);
                }
            }
        }
    }

    plotDistribution(dist, params, isCompare = false, isTarget = false, zoom = 1.0, domainOverride = null) {
        if (!this.ctx) return null;
        const { fg } = this.options;
        const { padding, plotWidth, plotHeight, drawable } = this.getPlotBounds();
        if (!drawable) return null;
        let accent = isCompare ? (this.options.accent || '#0066FF') : '#c8f542';
        if (isTarget) accent = '#ff3366'; // Highlight target curves in red

        let { xMin, xMax } = domainOverride || computePlotDomain(dist, params, zoom);

        // Cache coordinates for coordinate tooltip mapping
        this.xMin = xMin;
        this.xMax = xMax;

        let points = [];
        let maxY = 0.001;

        if (dist.isDiscrete) {
            for (let k = Math.floor(xMin); k <= Math.ceil(xMax); k++) {
                const y = dist.pmf(k, params);
                if (!Number.isFinite(y) || y < 0) continue;
                if (y > maxY) maxY = y;
                points.push({ x: k, y });
            }
        } else {
            const steps = 300;
            for (let i = 0; i <= steps; i++) {
                const x = xMin + (i / steps) * (xMax - xMin);
                const y = dist.pdf(x, params);
                if (!Number.isFinite(y) || y < 0) continue;
                if (y > maxY) maxY = y;
                points.push({ x, y });
            }
        }

        if (points.length === 0) return null;

        maxY = computeYDomain(dist, maxY);

        this.maxY = maxY;

        const toCanvasX = (val) => padding + ((val - xMin) / (xMax - xMin)) * plotWidth;
        const toCanvasY = (val) => this.height - padding - (val / maxY) * plotHeight;

        if (dist.isDiscrete) {
            const numBars = xMax - xMin + 1;
            const barW = Math.max(2, Math.min((plotWidth / numBars) * 0.7, 30));

            points.forEach(p => {
                const cx = toCanvasX(p.x);
                const cy = toCanvasY(p.y);
                const h = (this.height - padding) - cy;

                if (isTarget) {
                    // Render target as outline dotted bars
                    this.ctx.strokeStyle = accent;
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.beginPath();
                    this.ctx.roundRect(cx - barW / 2, cy, barW, h, [3, 3, 0, 0]);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                } else {
                    const grad = this.ctx.createLinearGradient(0, cy, 0, this.height - padding);
                    grad.addColorStop(0, accent);
                    grad.addColorStop(1, accent + '22');

                    this.ctx.fillStyle = grad;
                    this.ctx.beginPath();
                    this.ctx.roundRect(cx - barW / 2, cy, barW, h, [3, 3, 0, 0]);
                    this.ctx.fill();
                    
                    this.ctx.strokeStyle = fg;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();
                }
            });
        } else {
            // Continuous Area Fill (only for solid active curves, not compared or targets)
            if (!isCompare && !isTarget) {
                this.ctx.beginPath();
                this.ctx.moveTo(toCanvasX(points[0].x), this.height - padding);
                points.forEach(p => this.ctx.lineTo(toCanvasX(p.x), toCanvasY(p.y)));
                this.ctx.lineTo(toCanvasX(points[points.length - 1].x), this.height - padding);
                this.ctx.closePath();
                const grad = this.ctx.createLinearGradient(0, padding, 0, this.height - padding);
                grad.addColorStop(0, accent + '55');
                grad.addColorStop(1, accent + '04');
                this.ctx.fillStyle = grad;
                this.ctx.fill();
            }

            // Outline Curve
            this.ctx.beginPath();
            points.forEach((p, i) => {
                const cx = toCanvasX(p.x);
                const cy = toCanvasY(p.y);
                i === 0 ? this.ctx.moveTo(cx, cy) : this.ctx.lineTo(cx, cy);
            });
            
            if (isTarget) {
                this.ctx.strokeStyle = accent;
                this.ctx.lineWidth = 2.5;
                this.ctx.setLineDash([6, 4]);
            } else {
                this.ctx.strokeStyle = isCompare ? accent : fg;
                this.ctx.lineWidth = 3;
            }
            this.ctx.lineJoin = 'round';
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        return { xMin, xMax, maxY, points };
    }

    // --- Histogram for Sampling CLT Simulator ---
    drawHistogram(samples, xMinVal, xMaxVal, yMaxVal) {
        if (!this.ctx || !samples || samples.length === 0) return;
        const { padding } = this.options;
        const plotWidth = this.width - 2 * padding;
        const plotHeight = this.height - 2 * padding;

        // Count samples in bins
        const binCount = 25;
        const bins = new Array(binCount).fill(0);
        
        samples.forEach(s => {
            let binIdx = Math.floor(((s - xMinVal) / (xMaxVal - xMinVal)) * binCount);
            binIdx = Math.max(0, Math.min(binCount - 1, binIdx));
            bins[binIdx]++;
        });

        const maxBinVal = Math.max(...bins) || 1;
        const barW = plotWidth / binCount;

        // Draw histogram bars in semi-transparent light green
        bins.forEach((count, i) => {
            const countDensity = count / (samples.length * (xMaxVal - xMinVal) / binCount); // Relative frequency density
            
            // Map height relative to yMaxVal
            const h = (countDensity / yMaxVal) * plotHeight;
            const cx = padding + i * barW;
            const cy = this.height - padding - h;

            this.ctx.fillStyle = 'rgba(200, 245, 66, 0.4)';
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.rect(cx, cy, barW - 1, h);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    // --- LLN Convergence Line Widget ---
    drawLlnPath(data, targetValue) {
        if (!this.ctx || data.length === 0) return;
        const { padding, fg } = this.options;
        const plotWidth = this.width - 2 * padding;
        const plotHeight = this.height - 2 * padding;

        const maxIt = data.length;
        const toCanvasX = (idx) => padding + (idx / maxIt) * plotWidth;
        const toCanvasY = (val) => this.height - padding - (val / 1.0) * plotHeight; // Normal proportion bounds [0, 1]

        // Draw Target dotted line (0.50)
        this.ctx.strokeStyle = 'rgba(26, 26, 26, 0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, toCanvasY(targetValue));
        this.ctx.lineTo(this.width - padding, toCanvasY(targetValue));
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw Running Average path
        this.ctx.strokeStyle = fg;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        data.forEach((val, idx) => {
            const cx = toCanvasX(idx);
            const cy = toCanvasY(val);
            idx === 0 ? this.ctx.moveTo(cx, cy) : this.ctx.lineTo(cx, cy);
        });
        this.ctx.stroke();
    }

    // --- Tooltip coordinate conversion ---
    isCanvasPointInPlot(canvasX, canvasY) {
        const { padding, plotWidth, plotHeight, drawable } = this.getPlotBounds();
        return drawable && canvasX >= padding && canvasX <= padding + plotWidth && canvasY >= padding && canvasY <= padding + plotHeight;
    }

    canvasXToMathX(canvasX) {
        const { padding, plotWidth, drawable } = this.getPlotBounds();
        if (!drawable || this.xMax === this.xMin) return this.xMin;
        const clampedX = Math.max(padding, Math.min(padding + plotWidth, canvasX));
        const relX = (clampedX - padding) / plotWidth;
        return this.xMin + relX * (this.xMax - this.xMin);
    }
}
