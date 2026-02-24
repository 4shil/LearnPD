/**
 * Professional Canvas rendering engine.
 * Handles High-DPI scaling, grids, and distribution plotting.
 */
import gsap from 'gsap';

export class Renderer {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.options = {
            padding: 60,
            accent: '#E6FF00',
            fg: '#1D1D1F',
            grid: '#e0e0e0',
            lineWidth: 3,
            ...options
        };
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();

        // High-DPI scaling
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);

        this.width = rect.width;
        this.height = rect.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawGrid() {
        const { padding, grid } = this.options;
        this.ctx.strokeStyle = grid;
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= 10; i++) {
            let x = padding + (i * (this.width - 2 * padding) / 10);
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, this.height - padding);
            this.ctx.stroke();
        }
    }

    drawAxes() {
        const { padding, fg, lineWidth } = this.options;
        this.ctx.strokeStyle = fg;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.height - padding);
        this.ctx.lineTo(this.width - padding, this.height - padding);
        this.ctx.stroke();
    }

    plotDistribution(dist, params, isCompare = false) {
        const { padding, accent, fg } = this.options;
        const plotWidth = this.width - 2 * padding;
        const plotHeight = this.height - 2 * padding;

        let xMin = dist.range.min;
        let xMax = dist.range.max;

        if (dist.autoScaleX && dist.isDiscrete) {
            const mean = dist.mean(params);
            const variance = dist.variance(params);
            const std = Math.sqrt(variance);
            xMin = Math.max(dist.range.min, Math.floor(mean - 4 * std));
            xMax = Math.min(dist.range.max, Math.ceil(mean + 4 * std));
        }

        let points = [];
        let maxY = 0.001;

        if (dist.isDiscrete) {
            for (let k = Math.floor(xMin); k <= Math.ceil(xMax); k++) {
                const y = dist.pmf(k, params);
                if (y > maxY) maxY = y;
                points.push({ x: k, y: y });
            }
        } else {
            const steps = 300;
            for (let i = 0; i <= steps; i++) {
                const x = xMin + (i / steps) * (xMax - xMin);
                const y = dist.pdf(x, params);
                if (y > maxY && isFinite(y)) maxY = y;
                points.push({ x: x, y: y });
            }
        }

        if (dist.fixedY) {
            maxY = dist.fixedY;
        } else if (dist.autoScaleY) {
            maxY *= 1.2;
        } else {
            maxY = 1.0;
        }

        if (dist.isDiscrete) {
            const numBars = xMax - xMin + 1;
            const barWidth = Math.min((plotWidth / numBars) * 0.8, 40);

            points.forEach(p => {
                const canvasX = padding + ((p.x - xMin) / (xMax - xMin)) * plotWidth;
                const canvasY = this.height - padding - (p.y / maxY) * plotHeight;

                // Gradient fill for bars
                const grad = this.ctx.createLinearGradient(0, canvasY, 0, this.height - padding);
                grad.addColorStop(0, isCompare ? accent + 'CC' : accent);
                grad.addColorStop(1, isCompare ? accent + '44' : accent + '88');

                this.ctx.fillStyle = grad;
                this.ctx.fillRect(canvasX - barWidth / 2, canvasY, barWidth, (this.height - padding) - canvasY);
                this.ctx.strokeStyle = fg;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(canvasX - barWidth / 2, canvasY, barWidth, (this.height - padding) - canvasY);
            });
        } else {
            // Area fill with gradient
            if (!isCompare) {
                this.ctx.beginPath();
                this.ctx.moveTo(padding + ((points[0].x - xMin) / (xMax - xMin)) * plotWidth, this.height - padding);
                points.forEach(p => {
                    const canvasX = padding + ((p.x - xMin) / (xMax - xMin)) * plotWidth;
                    const canvasY = this.height - padding - (p.y / maxY) * plotHeight;
                    this.ctx.lineTo(canvasX, canvasY);
                });
                this.ctx.lineTo(padding + plotWidth, this.height - padding);
                this.ctx.closePath();

                const grad = this.ctx.createLinearGradient(0, padding, 0, this.height - padding);
                grad.addColorStop(0, accent + 'AA');
                grad.addColorStop(1, accent + '22');
                this.ctx.fillStyle = grad;
                this.ctx.fill();
            }

            // Line plot
            const pathData = { length: 0 };
            const fullLength = points.length;

            this.ctx.beginPath();
            this.ctx.strokeStyle = isCompare ? accent : fg;
            this.ctx.lineWidth = isCompare ? 4 : 6;

            gsap.to(pathData, {
                length: fullLength,
                duration: 0.6, // Much faster
                ease: 'expo.out', // Mechanical
                onUpdate: () => {
                    this.clear();
                    this.drawGrid();
                    this.drawAxes();

                    this.ctx.beginPath();
                    for (let j = 0; j < Math.ceil(pathData.length); j++) {
                        const p = points[j];
                        const canvasX = padding + ((p.x - xMin) / (xMax - xMin)) * plotWidth;
                        const canvasY = this.height - padding - (p.y / maxY) * plotHeight;
                        if (j === 0) this.ctx.moveTo(canvasX, canvasY);
                        else this.ctx.lineTo(canvasX, canvasY);
                    }
                    this.ctx.stroke();
                }
            });
        }

        return { xMin, xMax, maxY, points };
    }
}
