/**
 * LearnPD — Main Entry Point
 * Coordinates reactive store subscriptions, GSAP micro-animations,
 * custom magnetic cursors, Lenis scroll, and interactive curriculum canvas widgets.
 */

import { UI } from './ui/controller.js';
import { Renderer } from './renderer/canvas.js';
import { computeMergedPlotDomain } from './renderer/domain.js';
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

    // ── 4. Setup Renderers with dynamic ResizeObserver callbacks ──
    const mainRenderer = new Renderer('mainCanvas', {
        onResize: () => { store.notify(); }
    });
    const compareRenderer = new Renderer('compareCanvas', {
        onResize: () => { store.notify(); }
    });
    
    // Curriculum pane canvas renderers
    const ch1Renderer = new Renderer('ch1Canvas', {
        onResize: () => { drawChapter1Widget(); }
    });
    const ch2Renderer = new Renderer('ch2Canvas', {
        onResize: () => { drawChapter2Widget(); }
    });
    const ch3Renderer = new Renderer('ch3Canvas', {
        onResize: () => { drawChapter3Widget(); }
    });
    const ch4Renderer = new Renderer('ch4Canvas', {
        onResize: () => { drawChapter4Widget(); }
    });
    
    // Quiz and Simulator renderers
    const quizRenderer = new Renderer('quizCanvas', {
        onResize: () => { store.notify(); }
    });
    const simRenderer = new Renderer('simCanvas', {
        onResize: () => { store.notify(); }
    });

    // ── 5. Coordinate Tooltip Explorer logic (with Mobile Touch Support) ──
    const canvas = document.getElementById('mainCanvas');
    const tooltip = document.getElementById('canvasTooltip');
    
    if (canvas && tooltip) {
        const handleTooltipEvent = (e) => {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;
            if (!mainRenderer.isCanvasPointInPlot(mouseX, mouseY)) {
                tooltip.classList.add('hidden');
                return;
            }

            // Map pixel location to mathematical X coord
            const mathX = mainRenderer.canvasXToMathX(mouseX);
            const dist = DISTRIBUTIONS[store.state.currentDist];
            
            let prob = 0;
            try {
                prob = dist.isDiscrete ? dist.pmf(Math.round(mathX), store.state.params) : dist.pdf(mathX, store.state.params);
            } catch (err) {}

            tooltip.classList.remove('hidden');
            const tooltipX = Math.max(8, Math.min(rect.width - 120, mouseX + 12));
            const tooltipY = Math.max(8, Math.min(rect.height - 60, mouseY + 12));
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            
            const labelX = dist.isDiscrete ? Math.round(mathX) : mathX.toFixed(3);
            tooltip.innerText = `X: ${labelX}\nY: ${prob.toFixed(4)}`;
        };

        canvas.addEventListener('mousemove', handleTooltipEvent);
        canvas.addEventListener('touchstart', handleTooltipEvent, { passive: true });
        canvas.addEventListener('touchmove', handleTooltipEvent, { passive: true });

        const hideTooltip = () => {
            tooltip.classList.add('hidden');
        };
        canvas.addEventListener('mouseleave', hideTooltip);
        canvas.addEventListener('touchend', hideTooltip);
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
        if (!ctx) return;
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
        if (!ctx) return;
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
        if (!ctx) return;
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
    const btnRunLln = document.getElementById('btnRunLln');
    const btnClearLln = document.getElementById('btnClearLln');
    let llnFlips = [];
    let llnAverages = [];
    let llnTotal = 0;
    let llnHeads = 0;

    const runLlnFlips = () => {
        if (store.state.currentView !== 'chapters') return;
        
        for (let i = 0; i < 100; i++) {
            const result = Math.random() < 0.5 ? 1 : 0;
            llnFlips.push(result);
            llnTotal++;
            if (result === 1) llnHeads++;
            llnAverages.push(llnHeads / llnTotal);
        }

        document.getElementById('llnStats').innerText = `Total Flips: ${llnTotal} | Heads: ${llnHeads} (${(llnHeads / llnTotal * 100).toFixed(1)}%)`;
        drawChapter4Widget();
    };

    const clearLln = () => {
        llnFlips = [];
        llnAverages = [];
        llnTotal = 0;
        llnHeads = 0;
        document.getElementById('llnStats').innerText = `Total Flips: 0 | Heads: 0 (0.0%)`;
        drawChapter4Widget();
    };

    const drawChapter4Widget = () => {
        if (store.state.currentView !== 'chapters') return;
        ch4Renderer.resize();
        ch4Renderer.clear();
        ch4Renderer.drawGrid();
        ch4Renderer.drawAxes(0, Math.max(100, llnTotal), 1.0);
        ch4Renderer.drawLlnPath(llnAverages, 0.50);
    };

    if (btnRunLln && btnClearLln) {
        btnRunLln.addEventListener('click', runLlnFlips);
        btnClearLln.addEventListener('click', clearLln);
    }

    // Trigger widgets initialization on Chapters Tab selection
    const initChapterWidgets = () => {
        drawChapter1Widget();
        drawChapter2Widget();
        drawChapter3Widget();
        drawChapter4Widget();
    };

    // ── 8. CLT Simulator execution logic ──
    const btnSimOne = document.getElementById('btnSimulateOne');
    const btnSimBatch = document.getElementById('btnSimulateBatch');
    const btnSimLarge = document.getElementById('btnSimulateLarge');

    let currentSimRunId = 0; // Increment on every new simulation start or clear

    const disableSimControls = (disabled) => {
        const btnOne = document.getElementById('btnSimulateOne');
        const btnBatch = document.getElementById('btnSimulateBatch');
        const btnLarge = document.getElementById('btnSimulateLarge');
        const select = document.getElementById('simDistSelect');
        const sizeInput = document.getElementById('simSampleSize');
        const clearBtn = document.getElementById('btnClearSim');
        
        [btnOne, btnBatch, btnLarge, select, sizeInput, clearBtn].forEach(el => {
            if (el) el.disabled = disabled;
        });
        
        // Also disable sliders in sidebar
        const sliders = document.querySelectorAll('#simParams input');
        sliders.forEach(slider => {
            slider.disabled = disabled;
        });
    };

    const disableSimControls = (disabled) => {
        const btnOne = document.getElementById('btnSimulateOne');
        const btnBatch = document.getElementById('btnSimulateBatch');
        const btnLarge = document.getElementById('btnSimulateLarge');
        [btnOne, btnBatch, btnLarge].forEach(b => { if (b) b.disabled = disabled; });
    };

    // runSimulationBatch handles running the CLT simulator batch asynchronously
    // log simulation batch count if debug mode is active
    const runSimulationBatch = (count) => {
        if (store.state.simulator.isRunning) return;
        
        const sim = store.state.simulator;
        const dist = DISTRIBUTIONS[sim.dist];
        const n = sim.sampleSize;

        currentSimRunId++;
        const runId = currentSimRunId;

        currentSimRunId++;
        const runId = currentSimRunId;
        let step = 0;
        const addSampleMeanStep = () => {
            // Abort if context changed or reset
            if (runId !== currentSimRunId || store.state.currentView !== 'simulator') {
                store.state.simulator.isRunning = false;
                disableSimControls(false);
                store.notify();
                return;
            }

            if (store.state.currentView !== 'simulator') {
                store.state.simulator.isRunning = false;
                disableSimControls(false);
                return;
            }
            if (sim.results.length === 0 && step > 0) {
                store.state.simulator.isRunning = false;
                disableSimControls(false);
                return;
            }
            if (step >= count) {
                store.state.simulator.isRunning = false;
                disableSimControls(false);
                store.notify();
                return;
            }
            
            // Draw n samples and find mean
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += dist.sample(sim.params);
            }
            const meanVal = sum / n;
            store.addSimSample(meanVal);

            step++;
            
            // Stagger animations based on size
            if (count <= 1) {
                store.state.simulator.isRunning = false;
                disableSimControls(false);
                store.notify();
            } else if (count <= 100) {
                if (step % 5 === 0 || step === count) {
                    store.notify();
                }
                requestAnimationFrame(addSampleMeanStep);
            } else {
                if (step % 50 === 0 || step === count) {
                    store.notify();
                }
                requestAnimationFrame(addSampleMeanStep);
            }
        };

        store.state.simulator.isRunning = true;
        disableSimControls(true);
        addSampleMeanStep();
    };

    if (btnSimOne) btnSimOne.addEventListener('click', () => runSimulationBatch(1));
    if (btnSimBatch) btnSimBatch.addEventListener('click', () => runSimulationBatch(100));
    if (btnSimLarge) btnSimLarge.addEventListener('click', () => runSimulationBatch(1000));

    const clearBtn = document.getElementById('btnClearSim');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentSimRunId++; // Interrupts active simulation loops
            store.state.simulator.isRunning = false;
            disableSimControls(false);
            store.clearSim();
        });
    }

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
                const compareDistB = DISTRIBUTIONS[state.compare.dist2];
                const mergedDomain = computeMergedPlotDomain([
                    { dist, params: state.params },
                    { dist: compareDistB, params: state.compare.params2 }
                ], state.zoom);
                const resA = mainRenderer.plotDistribution(dist, state.params, false, false, state.zoom, mergedDomain);
                
                mainRenderer.options.accent = '#0066FF';
                const resB = mainRenderer.plotDistribution(compareDistB, state.compare.params2, true, false, state.zoom, mergedDomain);
                mainRenderer.options.accent = '#c8f542'; // Restore default

                mainRenderer.drawAxes(resA.xMin, resA.xMax, Math.max(resA.maxY, resB.maxY));
                
                const readout = document.getElementById('brutalReadout');
                if (readout) readout.innerText = `A: ${dist.name} vs B: ${compareDistB.name}`;

                // Update Legend
                const legend = document.getElementById('mainCompareLegend');
                if (legend) {
                    legend.classList.remove('hidden');
                    document.getElementById('legendModelAText').innerText = `A: ${dist.name}`;
                    document.getElementById('legendModelBText').innerText = `B: ${compareDistB.name}`;
                }
            } else {
                const res = mainRenderer.plotDistribution(dist, state.params, false, false, state.zoom);
                mainRenderer.drawAxes(res.xMin, res.xMax, res.maxY);
                
                const mean = dist.mean(state.params);
                const variance = dist.variance(state.params);
                const readout = document.getElementById('brutalReadout');
                if (readout) {
                    const formatVal = (v) => {
                        if (isNaN(v)) return 'NaN';
                        if (!Number.isFinite(v)) return v > 0 ? '∞' : '-∞';
                        return v.toFixed(3);
                    };
                    readout.innerText = `μ = ${formatVal(mean)}  σ² = ${formatVal(variance)}`;
                }

                const legend = document.getElementById('mainCompareLegend');
                if (legend) legend.classList.add('hidden');
            }
        }

        // Compare standalone view
        if (state.currentView === 'compare') {
            compareRenderer.resize();
            compareRenderer.clear();
            compareRenderer.drawGrid();
            
            const d1 = DISTRIBUTIONS[state.compare.dist1];
            const d2 = DISTRIBUTIONS[state.compare.dist2];
            const mergedDomain = computeMergedPlotDomain([
                { dist: d1, params: state.compare.params1 },
                { dist: d2, params: state.compare.params2 }
            ], state.zoom);
            
            compareRenderer.options.accent = '#FF3E00';
            const resA = compareRenderer.plotDistribution(d1, state.compare.params1, true, false, state.zoom, mergedDomain);
            compareRenderer.options.accent = '#0066FF';
            const resB = compareRenderer.plotDistribution(d2, state.compare.params2, true, false, state.zoom, mergedDomain);
            compareRenderer.options.accent = '#c8f542'; // Restore default

            compareRenderer.drawAxes(resA.xMin, resA.xMax, Math.max(resA.maxY, resB.maxY));

            const s1 = document.getElementById('compare1Stats');
            const s2 = document.getElementById('compare2Stats');
            const formatVal = (v) => {
                if (isNaN(v)) return 'NaN';
                if (!Number.isFinite(v)) return v > 0 ? '∞' : '-∞';
                return v.toFixed(2);
            };
            if (s1) {
                const m = d1.mean(state.compare.params1);
                const v = d1.variance(state.compare.params1);
                s1.innerHTML = `μ = ${formatVal(m)}<br>σ² = ${formatVal(v)}`;
            }
            if (s2) {
                const m = d2.mean(state.compare.params2);
                const v = d2.variance(state.compare.params2);
                s2.innerHTML = `μ = ${formatVal(m)}<br>σ² = ${formatVal(v)}`;
            }
        }

        // Chapters view
        if (state.currentView === 'chapters') {
            initChapterWidgets();
        }

        // Quiz Matching rendering
        if (state.currentView === 'quiz' && state.quiz.started && !state.quiz.completed) {
            const q = state.quiz.questions[state.quiz.currentIndex];
            if (q.type === 'match') {
                quizRenderer.resize();
                quizRenderer.clear();
                quizRenderer.drawGrid();
                
                const distObj = DISTRIBUTIONS[q.dist];
                const userParams = state.quiz.selections[state.quiz.currentIndex];

                // 1. Plot target distribution (dotted red)
                const targetRes = quizRenderer.plotDistribution(distObj, q.targetParams, false, true);

                // 2. Plot user active distribution (solid dark)
                const userRes = quizRenderer.plotDistribution(distObj, userParams, false, false);
                
                quizRenderer.drawAxes(targetRes.xMin, targetRes.xMax, Math.max(targetRes.maxY, userRes.maxY));

                // Calculate match accuracy distance percentage
                let distDistance = 0;
                distObj.params.forEach(p => {
                    const normRange = p.max - p.min;
                    distDistance += Math.pow((userParams[p.id] - q.targetParams[p.id]) / normRange, 2);
                });
                distDistance = Math.sqrt(distDistance);
                const accuracyPercent = Math.max(0, Math.min(100, Math.round((1 - distDistance) * 100)));

                document.getElementById('quizMatchReadout').innerText = `Match: ${accuracyPercent}%`;
            }
        }

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

            const formatVal = (v) => {
                if (isNaN(v)) return 'NaN';
                if (!Number.isFinite(v)) return v > 0 ? '∞' : '-∞';
                return v.toFixed(3);
            };

            document.getElementById('simTheoryMean').innerText = formatVal(theoryMean);
            document.getElementById('simObsMean').innerText = obsMean === 0 ? '0.000' : formatVal(obsMean);
            document.getElementById('simTheorySe').innerText = formatVal(theorySe);
            document.getElementById('simObsSe').innerText = obsSe === 0 ? '0.000' : formatVal(obsSe);

            // Plot sample histograms
            // Target scaling boundaries for sampling distributions
            const plotYMax = 1 / (theorySe * Math.sqrt(2 * Math.PI)) * 1.25;

            simRenderer.drawHistogram(sim.results, xMin, xMax, plotYMax);

            // Overlay theoretical Central Limit Theorem Normal approximation curve (in dotted red)
            const norm = DISTRIBUTIONS.normal;
            const cltParams = { mu: theoryMean, sigma: theorySe };
            
            const ctx = simRenderer.ctx;
            if (ctx) {
                const { padding } = simRenderer.options;
                const plotW = simRenderer.width - 2 * padding;
                const plotH = simRenderer.height - 2 * padding;

                const toX = (v) => padding + ((v - xMin) / (xMax - xMin)) * plotW;
                const toY = (v) => simRenderer.height - padding - (v / plotYMax) * plotH;

                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                for (let i = 0; i <= 100; i++) {
                    const x = xMin + (i / 100) * (xMax - xMin);
                    const y = norm.pdf(x, cltParams);
                    i === 0 ? ctx.moveTo(toX(x), toY(y)) : ctx.lineTo(toX(x), toY(y));
                }
                ctx.stroke();
            }

            simRenderer.drawAxes(xMin, xMax, plotYMax);
        }

        // Handle view change transition animations
        if (lastView !== state.currentView) {
            animateView(state.currentView);
            lastView = state.currentView;

            // Interrupt any active CLT simulation loop if view switched
            if (state.currentView !== 'simulator') {
                currentSimRunId++;
                if (store.state.simulator.isRunning) {
                    store.state.simulator.isRunning = false;
                    disableSimControls(false);
                }
            }
        }
    });

    // ── 10. Standalone Comparison View Zoom Binding ──
    const compareZoomIn = document.getElementById('btnCompareZoomIn');
    const compareZoomOut = document.getElementById('btnCompareZoomOut');
    if (compareZoomIn) compareZoomIn.addEventListener('click', () => store.adjustZoom(0.1));
    if (compareZoomOut) compareZoomOut.addEventListener('click', () => store.adjustZoom(-0.1));

    // ── 11. Initial boot ──
    const hash = window.location.hash.substring(1) || 'home';
    store.switchView(hash);
    lastView = hash;
});
