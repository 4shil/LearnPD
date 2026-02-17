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

    // Chapter 2 Widget: Binomial Poisson Convergence

    // Chapter 3 Widget: Normal Standardization

    // Chapter 4 Widget: Law of Large Numbers Coin Flips

    // Trigger widgets initialization on Chapters Tab selection

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

        // Quiz Matching rendering

        // Sampling CLT Simulator Rendering

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