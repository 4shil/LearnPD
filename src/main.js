/**
 * LearnPD — Main Entry Point
 * Coordinates reactive store subscriptions, GSAP micro-animations,
 * custom magnetic cursors, Lenis scroll, and interactive curriculum canvas widgets.
 */

import { UI } from './ui/controller.js';
import { Renderer } from './renderer/canvas.js';
import { store } from './core/state.js';
import { DISTRIBUTIONS } from './math/dist.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import './style.css';

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. Preloader Animation ──
    const preloaderBar = document.querySelector('.preloader__progress');
    if (preloaderBar) {
        setTimeout(() => { preloaderBar.style.width = '100%'; }, 100);
    }
    
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    tl.to('.preloader__text', { y: -20, opacity: 0, duration: 0.5, delay: 0.9 })
      .to('.preloader', { yPercent: -100, duration: 0.6 })
      .set('.preloader', { display: 'none' });

    // ── 2. UI Controller & Smooth Scroll ──
    const ui = new UI();
    const lenis = new Lenis();
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // ── 3. Custom Cursor ──
    const dot = document.getElementById('cursor');
    const ring = document.getElementById('cursorFollower');
    let mx = 0, my = 0;

    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        gsap.to(dot, { x: mx, y: my, duration: 0.05, ease: 'power2.out' });
        gsap.to(ring, { x: mx, y: my, duration: 0.25, ease: 'power2.out' });
    });

    const attachCursorHover = () => {
        document.querySelectorAll('a, button, select, input, .card, .chapter-item, .quiz-option-btn').forEach(el => {
            if (el.dataset.cursorBound) return;
            el.dataset.cursorBound = 'true';
            el.addEventListener('mouseenter', () => ring.classList.add('active'));
            el.addEventListener('mouseleave', () => ring.classList.remove('active'));
        });
    };
    attachCursorHover();

    // Re-attach cursor listeners on DOM mutations
    const observer = new MutationObserver(attachCursorHover);
    observer.observe(document.body, { childList: true, subtree: true });

    // --- MATHEMATICAL ACCURACY TEST HARNESS ---
    console.log("--- RUNNING MATHEMATICAL ACCURACY TESTS ---");
    try {
        const testDists = ['normal', 'uniform', 'bernoulli', 'binomial', 'poisson', 'exponential'];
        testDists.push('geometric');
        testDists.push('hypergeometric');
        testDists.push('gamma');
        testDists.push('beta');
        testDists.push('chisquare');
        testDists.push('lognormal');
        testDists.push('studentt');
        testDists.push('weibull');

        testDists.forEach(dId => {
            const d = DISTRIBUTIONS[dId];
            if (!d) return;
            const p = {};
            d.params.forEach(param => { p[param.id] = param.default; });
            const meanVal = d.mean(p);
            const varVal = d.variance(p);
            console.log(`[TEST] ${d.name}: Mean = ${meanVal}, Var = ${varVal}`);
        });
    } catch(err) {
        console.error("Test harness failed:", err);
    }
    console.log("-----------------------------------------");

    // ── 4. Setup Renderers ──
    const mainRenderer = new Renderer('mainCanvas');
    const compareRenderer = new Renderer('compareCanvas');
    
    // Curriculum pane canvas renderers
    const ch1Renderer = new Renderer('ch1Canvas');
    const ch2Renderer = new Renderer('ch2Canvas');
    const ch3Renderer = new Renderer('ch3Canvas');
    const ch4Renderer = new Renderer('ch4Canvas');
    
    // Quiz and Simulator renderers
    const quizRenderer = new Renderer('quizCanvas');
    const simRenderer = new Renderer('simCanvas');

    // ── 5. Coordinate Tooltip Explorer logic ──
    const canvas = document.getElementById('mainCanvas');
    const tooltip = document.getElementById('canvasTooltip');
    
    if (canvas && tooltip) {
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Map pixel location to mathematical X coord
            const mathX = mainRenderer.canvasXToMathX(mouseX);
            const dist = DISTRIBUTIONS[store.state.currentDist];
            
            let prob = 0;
            try {
                prob = dist.isDiscrete ? dist.pmf(Math.round(mathX), store.state.params) : dist.pdf(mathX, store.state.params);
            } catch (err) {}

            tooltip.classList.remove('hidden');
            tooltip.style.left = `${e.clientX - rect.left}px`;
            tooltip.style.top = `${e.clientY - rect.top}px`;
            
            const labelX = dist.isDiscrete ? Math.round(mathX) : mathX.toFixed(3);
            tooltip.innerText = `X: ${labelX}\nY: ${prob.toFixed(4)}`;
        });

        canvas.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });
    }

    // ── 6. View Entry Animations ──
    const animateView = (viewId) => {
        const targets = document.querySelectorAll(`#${viewId} .card, #${viewId} .hero, #${viewId} .section-title, #${viewId} .chart-container, #${viewId} .chapters-layout`);
        gsap.fromTo(targets,
            { y: 25, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'expo.out', clearProps: 'transform' }
        );
    };

    // ── 7. Chapter Widget Subscriptions ──
    let ch1Type = 'pdf'; // or 'cdf'
    const btnPdf = document.getElementById('btnPdfToggle');
    const btnCdf = document.getElementById('btnCdfToggle');
    const ch1Slider = document.getElementById('ch1Slider');

    if (btnPdf && btnCdf) {
        btnPdf.addEventListener('click', () => {
            ch1Type = 'pdf';
            btnPdf.className = 'btn btn--small btn--primary';
            btnCdf.className = 'btn btn--small btn--ghost';
            drawChapter1Widget();
        });
        btnCdf.addEventListener('click', () => {
            ch1Type = 'cdf';
            btnPdf.className = 'btn btn--small btn--ghost';
            btnCdf.className = 'btn btn--small btn--primary';
            drawChapter1Widget();
        });
    }
    if (ch1Slider) {
        ch1Slider.addEventListener('input', (e) => {
            document.getElementById('ch1XVal').innerText = parseFloat(e.target.value).toFixed(2);
            drawChapter1Widget();
        });
    }

    const drawChapter1Widget = () => {
        if (store.state.currentView !== 'chapters') return;
        ch1Renderer.resize();
        ch1Renderer.clear();
        ch1Renderer.drawGrid();
        ch1Renderer.drawAxes(-3, 3, 1.0);

        const xVal = parseFloat(ch1Slider.value);
        const norm = DISTRIBUTIONS.normal;
        const normParams = { mu: 0, sigma: 1 };

        // Plot PDF or CDF curve
        const ctx = ch1Renderer.ctx;
        const { padding } = ch1Renderer.options;
        const plotW = ch1Renderer.width - 2 * padding;
        const plotH = ch1Renderer.height - 2 * padding;

        const toCanvasX = (v) => padding + ((v + 3) / 6) * plotW;
        const toCanvasY = (v) => ch1Renderer.height - padding - (v / 1.0) * plotH;

        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = -3 + (i / 100) * 6;
            const y = ch1Type === 'pdf' ? norm.pdf(x, normParams) : norm.cdf(x, normParams);
            const cx = toCanvasX(x);
            const cy = toCanvasY(y);
            i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
        }
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw active slider pointer vertical line
        const cx = toCanvasX(xVal);
        const yVal = ch1Type === 'pdf' ? norm.pdf(xVal, normParams) : norm.cdf(xVal, normParams);
        const cy = toCanvasY(yVal);

        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, ch1Renderer.height - padding);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        document.getElementById('ch1Readout').innerText = `${ch1Type === 'pdf' ? 'f' : 'F'}(${xVal.toFixed(2)}) = ${yVal.toFixed(3)}`;
    };

    // Chapter 2 Widget: Binomial Poisson Convergence
    const ch2SliderN = document.getElementById('ch2SliderN');
    const ch2SliderP = document.getElementById('ch2SliderP');

    const drawChapter2Widget = () => {
        if (store.state.currentView !== 'chapters') return;
        ch2Renderer.resize();
        ch2Renderer.clear();
        ch2Renderer.drawGrid();
        ch2Renderer.drawAxes(0, 30, 0.4);

        const n = parseInt(ch2SliderN.value);
        const p = parseFloat(ch2SliderP.value);
        const lmb = n * p;
        document.getElementById('ch2NVal').innerText = n;
        document.getElementById('ch2PVal').innerText = p.toFixed(2);
        document.getElementById('ch2Readout').innerText = `λ = n × p = ${lmb.toFixed(2)}`;

        const ctx = ch2Renderer.ctx;
        const { padding } = ch2Renderer.options;
        const plotW = ch2Renderer.width - 2 * padding;
        const plotH = ch2Renderer.height - 2 * padding;

        const toX = (v) => padding + (v / 30) * plotW;
        const toY = (v) => ch2Renderer.height - padding - (v / 0.4) * plotH;

        // Plot Binomial as bar chart outlines
        const binDist = DISTRIBUTIONS.binomial;
        const binParams = { n, p };
        const barW = Math.max(2, (plotW / 30) * 0.5);

        for (let k = 0; k <= 30; k++) {
            const y = binDist.pmf(k, binParams);
            const cx = toX(k);
            const cy = toY(y);
            const h = (ch2Renderer.height - padding) - cy;

            ctx.fillStyle = 'rgba(200, 245, 66, 0.6)';
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(cx - barW/2, cy, barW, h);
            ctx.fill();
            ctx.stroke();
        }

        // Plot Poisson approximation curve as overlay
        const poiDist = DISTRIBUTIONS.poisson;
        const poiParams = { lambda: lmb };

        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k <= 30; k++) {
            const y = poiDist.pmf(k, poiParams);
            const cx = toX(k);
            const cy = toY(y);
            k === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
            
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.stroke();
    };

    if (ch2SliderN && ch2SliderP) {
        ch2SliderN.addEventListener('input', drawChapter2Widget);
        ch2SliderP.addEventListener('input', drawChapter2Widget);
    }

    // Chapter 3 Widget: Normal Standardization
    const ch3Mu = document.getElementById('ch3SliderMu');
    const ch3Sigma = document.getElementById('ch3SliderSigma');

    const drawChapter3Widget = () => {
        if (store.state.currentView !== 'chapters') return;
        ch3Renderer.resize();
        ch3Renderer.clear();
        ch3Renderer.drawGrid();
        ch3Renderer.drawAxes(-6, 6, 0.8);

        const mu = parseFloat(ch3Mu.value);
        const sig = parseFloat(ch3Sigma.value);
        document.getElementById('ch3MuVal').innerText = mu.toFixed(1);
        document.getElementById('ch3SigmaVal').innerText = sig.toFixed(1);
        document.getElementById('ch3Readout').innerText = `Z = (X - ${mu.toFixed(1)}) / ${sig.toFixed(1)}`;

        const ctx = ch3Renderer.ctx;
        const { padding } = ch3Renderer.options;
        const plotW = ch3Renderer.width - 2 * padding;
        const plotH = ch3Renderer.height - 2 * padding;

        const toX = (v) => padding + ((v + 6) / 12) * plotW;
        const toY = (v) => ch3Renderer.height - padding - (v / 0.8) * plotH;

        const norm = DISTRIBUTIONS.normal;

        // Plot Standard Normal Target dotted line (N(0,1))
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = -6 + (i / 100) * 12;
            const y = norm.pdf(x, { mu: 0, sigma: 1 });
            i === 0 ? ctx.moveTo(toX(x), toY(y)) : ctx.lineTo(toX(x), toY(y));
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot active normal curve (solid line)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const x = -6 + (i / 100) * 12;
            const y = norm.pdf(x, { mu, sigma: sig });
            i === 0 ? ctx.moveTo(toX(x), toY(y)) : ctx.lineTo(toX(x), toY(y));
        }
        ctx.stroke();
    };

    if (ch3Mu && ch3Sigma) {
        ch3Mu.addEventListener('input', drawChapter3Widget);
        ch3Sigma.addEventListener('input', drawChapter3Widget);
    }

    // Chapter 4 Widget: Law of Large Numbers Coin Flips

    // Trigger widgets initialization on Chapters Tab selection
    const initChapterWidgets = () => {
        drawChapter1Widget();
        drawChapter2Widget();
        drawChapter3Widget();
    };

    // ── 8. CLT Simulator execution logic ──

    // ── 9. Store Subscription rendering updates ──
    let lastView = null;
    store.subscribe((state) => {
        
        // Explorer view sandbox
        if (state.currentView === 'explorer') {
            mainRenderer.resize();
            mainRenderer.clear();
            mainRenderer.drawGrid();
            
            const dist = DISTRIBUTIONS[state.currentDist];
            
            if (state.compareOverlay) {
                // Draw split comparison overlay A and B on the same canvas
                const resA = mainRenderer.plotDistribution(dist, state.params, false, false, state.zoom);
                
                const compareDistB = DISTRIBUTIONS[state.compare.dist2];
                mainRenderer.options.accent = '#0066FF';
                const resB = mainRenderer.plotDistribution(compareDistB, state.compare.params2, true, false, state.zoom);
                mainRenderer.options.accent = '#c8f542'; // Restore default

                mainRenderer.drawAxes(resA.xMin, resA.xMax, Math.max(resA.maxY, resB.maxY));
                
                const readout = document.getElementById('brutalReadout');
                if (readout) readout.innerText = `A: ${dist.name} vs B: ${compareDistB.name}`;
            } else {
                const res = mainRenderer.plotDistribution(dist, state.params, false, false, state.zoom);
                mainRenderer.drawAxes(res.xMin, res.xMax, res.maxY);
                
                const mean = dist.mean(state.params);
                const variance = dist.variance(state.params);
                const readout = document.getElementById('brutalReadout');
                if (readout) {
                    const formattedMean = isNaN(mean) ? 'NaN' : mean.toFixed(3);
                    const formattedVar = isNaN(variance) ? 'NaN' : variance.toFixed(3);
                    readout.innerText = `μ = ${formattedMean}  σ² = ${formattedVar}`;
                }
            }
        }

        // Compare standalone view
        if (state.currentView === 'compare') {
            compareRenderer.resize();
            compareRenderer.clear();
            compareRenderer.drawGrid();
            
            const d1 = DISTRIBUTIONS[state.compare.dist1];
            const d2 = DISTRIBUTIONS[state.compare.dist2];
            
            compareRenderer.options.accent = '#FF3E00';
            const resA = compareRenderer.plotDistribution(d1, state.compare.params1, true, false, state.zoom);
            compareRenderer.options.accent = '#0066FF';
            const resB = compareRenderer.plotDistribution(d2, state.compare.params2, true, false, state.zoom);
            compareRenderer.options.accent = '#c8f542'; // Restore default

            compareRenderer.drawAxes(resA.xMin, resA.xMax, Math.max(resA.maxY, resB.maxY));

            const s1 = document.getElementById('compare1Stats');
            const s2 = document.getElementById('compare2Stats');
            if (s1) {
                const m = d1.mean(state.compare.params1);
                const v = d1.variance(state.compare.params1);
                s1.innerHTML = `μ = ${isNaN(m) ? 'NaN' : m.toFixed(2)}<br>σ² = ${isNaN(v) ? 'NaN' : v.toFixed(2)}`;
            }
            if (s2) {
                const m = d2.mean(state.compare.params2);
                const v = d2.variance(state.compare.params2);
                s2.innerHTML = `μ = ${isNaN(m) ? 'NaN' : m.toFixed(2)}<br>σ² = ${isNaN(v) ? 'NaN' : v.toFixed(2)}`;
            }
        }

        // Chapters view
        if (state.currentView === 'chapters') {
            initChapterWidgets();
        }

        // Quiz Matching rendering

        // Sampling CLT Simulator Rendering
        if (state.currentView === 'simulator') {
            simRenderer.resize();
            simRenderer.clear();
            simRenderer.drawGrid();

            const sim = state.simulator;
            const dist = DISTRIBUTIONS[sim.dist];
            const n = sim.sampleSize;

            // Define mathematical bounds of source distribution
            let xMin = dist.range.min;
            let xMax = dist.range.max;
            if (dist.autoScaleX) {
                const mean = dist.mean(sim.params);
                const std = Math.sqrt(dist.variance(sim.params)) || 1;
                xMin = Math.max(dist.range.min, mean - 3.5 * std);
                xMax = Math.min(dist.range.max, mean + 3.5 * std);
            }

            // Theoretical Expected values of Sample Means
            const theoryMean = dist.mean(sim.params);
            const theoryVariance = dist.variance(sim.params);
            const theorySe = Math.sqrt(theoryVariance / n);

            // Observed values
            let obsMean = 0;
            let obsSe = 0;
            
            if (sim.results.length > 0) {
                let sum = 0;
                sim.results.forEach(val => sum += val);
                obsMean = sum / sim.results.length;

                let sqDiffSum = 0;
                sim.results.forEach(val => sqDiffSum += Math.pow(val - obsMean, 2));
                obsSe = Math.sqrt(sqDiffSum / (sim.results.length || 1));
            }

            document.getElementById('simTheoryMean').innerText = isNaN(theoryMean) ? 'NaN' : theoryMean.toFixed(3);
            document.getElementById('simObsMean').innerText = obsMean === 0 ? '0.000' : obsMean.toFixed(3);
            document.getElementById('simTheorySe').innerText = isNaN(theorySe) ? 'NaN' : theorySe.toFixed(3);
            document.getElementById('simObsSe').innerText = obsSe === 0 ? '0.000' : obsSe.toFixed(3);

            // Plot sample histograms
            // Target scaling boundaries for sampling distributions
            const plotYMax = 1 / (theorySe * Math.sqrt(2 * Math.PI)) * 1.25;

            simRenderer.drawHistogram(sim.results, xMin, xMax, plotYMax);


            simRenderer.drawAxes(xMin, xMax, plotYMax);
        }

        // Handle view change transition animations
        if (lastView !== state.currentView) {
            animateView(state.currentView);
            lastView = state.currentView;
        }
    });

    // ── 10. Window Resize Observer ──
    window.addEventListener('resize', () => {
        mainRenderer.resize();
        compareRenderer.resize();
        ch1Renderer.resize();
        ch2Renderer.resize();
        ch3Renderer.resize();
        ch4Renderer.resize();
        quizRenderer.resize();
        simRenderer.resize();
        store.notify();
    });

    // ── 11. Initial boot ──
    const hash = window.location.hash.substring(1) || 'home';
    store.switchView(hash);
    lastView = hash;
});