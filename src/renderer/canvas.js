/**
 * Canvas Renderer — Clean, instant plotting.
 * No GSAP in the render path. High-DPI aware.
 */

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
        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
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
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawGrid() {
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

    drawAxes() {
        if (!this.ctx) return;
        const { padding, fg } = this.options;
        this.ctx.strokeStyle = fg;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, this.height - padding);
        this.ctx.lineTo(this.width - padding, this.height - padding);
        this.ctx.stroke();
    }

    plotDistribution(dist, params, isCompare = false) {
        if (!this.ctx) return;
        const { padding, accent, fg } = this.options;
        const plotWidth = this.width - 2 * padding;
        const plotHeight = this.height - 2 * padding;

        let xMin = dist.range.min;
        let xMax = dist.range.max;

        if (dist.autoScaleX && dist.isDiscrete) {
            const mean = dist.mean(params);
            const std = Math.sqrt(dist.variance(params));
            xMin = Math.max(dist.range.min, Math.floor(mean - 4 * std));
            xMax = Math.min(dist.range.max, Math.ceil(mean + 4 * std));
        }

        let points = [];
        let maxY = 0.001;

        if (dist.isDiscrete) {
            for (let k = Math.floor(xMin); k <= Math.ceil(xMax); k++) {
                const y = dist.pmf(k, params);
                if (y > maxY) maxY = y;
                points.push({ x: k, y });
            }
        } else {
            const steps = 300;
            for (let i = 0; i <= steps; i++) {
                const x = xMin + (i / steps) * (xMax - xMin);
                const y = dist.pdf(x, params);
                if (y > maxY && isFinite(y)) maxY = y;
                points.push({ x, y });
            }
        }

        if (dist.fixedY) maxY = dist.fixedY;
        else if (dist.autoScaleY) maxY *= 1.2;
        else maxY = 1.0;

        const toCanvasX = (val) => padding + ((val - xMin) / (xMax - xMin)) * plotWidth;
        const toCanvasY = (val) => this.height - padding - (val / maxY) * plotHeight;

        if (dist.isDiscrete) {
            const numBars = xMax - xMin + 1;
            const barW = Math.min((plotWidth / numBars) * 0.7, 36);

            points.forEach(p => {
                const cx = toCanvasX(p.x);
                const cy = toCanvasY(p.y);
                const h = (this.height - padding) - cy;

                // Gradient bar
                const grad = this.ctx.createLinearGradient(0, cy, 0, this.height - padding);
                grad.addColorStop(0, isCompare ? accent : accent);
                grad.addColorStop(1, isCompare ? accent + '44' : accent + '66');

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.roundRect(cx - barW / 2, cy, barW, h, [4, 4, 0, 0]);
                this.ctx.fill();
                this.ctx.strokeStyle = fg;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            });
        } else {
            // Area fill
            if (!isCompare) {
                this.ctx.beginPath();
                this.ctx.moveTo(toCanvasX(points[0].x), this.height - padding);
                points.forEach(p => this.ctx.lineTo(toCanvasX(p.x), toCanvasY(p.y)));
                this.ctx.lineTo(toCanvasX(points[points.length - 1].x), this.height - padding);
                this.ctx.closePath();
                const grad = this.ctx.createLinearGradient(0, padding, 0, this.height - padding);
                grad.addColorStop(0, accent + '55');
                grad.addColorStop(1, accent + '08');
                this.ctx.fillStyle = grad;
                this.ctx.fill();
            }

            // Line
            this.ctx.beginPath();
            points.forEach((p, i) => {
                const cx = toCanvasX(p.x);
                const cy = toCanvasY(p.y);
                i === 0 ? this.ctx.moveTo(cx, cy) : this.ctx.lineTo(cx, cy);
            });
            this.ctx.strokeStyle = isCompare ? accent : fg;
            this.ctx.lineWidth = isCompare ? 2.5 : 3;
            this.ctx.lineJoin = 'round';
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        return { xMin, xMax, maxY, points };
    }
}
