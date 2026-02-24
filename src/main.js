/**
 * LearnPD — Main Entry Point
 * Soft Neo-Brutalist Edition
 */
import { UI } from './ui/controller.js';
import { Renderer } from './renderer/canvas.js';
import { store } from './core/state.js';
import { DISTRIBUTIONS } from './math/dist.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import './style.css';

document.addEventListener('DOMContentLoaded', () => {

    // ── Preloader ──
    const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    tl.to('.preloader__text', { y: -20, opacity: 0, duration: 0.6, delay: 0.8 })
        .to('.preloader', { yPercent: -100, duration: 0.8 })
        .set('.preloader', { display: 'none' });

    // ── UI Controller ──
    const ui = new UI();

    // ── Smooth Scroll ──
    const lenis = new Lenis();
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // ── Custom Cursor ──
    const dot = document.getElementById('cursor');
    const ring = document.getElementById('cursorFollower');
    let mx = 0, my = 0;

    window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        gsap.to(dot, { x: mx, y: my, duration: 0.08, ease: 'power2.out' });
        gsap.to(ring, { x: mx, y: my, duration: 0.35, ease: 'power2.out' });
    });

    // Interactive hover state
    const attachCursorHover = () => {
        document.querySelectorAll('a, button, select, input, .card').forEach(el => {
            if (el.dataset.cursorBound) return;
            el.dataset.cursorBound = 'true';
            el.addEventListener('mouseenter', () => ring.classList.add('active'));
            el.addEventListener('mouseleave', () => ring.classList.remove('active'));
        });
    };
    attachCursorHover();

    // Re-attach on DOM mutations
    const observer = new MutationObserver(attachCursorHover);
    observer.observe(document.body, { childList: true, subtree: true });

    // ── Renderers ──
    const mainRenderer = new Renderer('mainCanvas');
    const compareRenderer = new Renderer('compareCanvas');

    // ── View Animations ──
    const animateView = (viewId) => {
        const targets = document.querySelectorAll(`#${viewId} .card, #${viewId} .hero, #${viewId} .section-title, #${viewId} .chart-container`);
        gsap.fromTo(targets,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'expo.out', clearProps: 'transform' }
        );
    };

    // ── Store Subscription ──
    let lastView = null;
    store.subscribe((state) => {
        // Explorer
        if (state.currentView === 'explorer') {
            mainRenderer.resize();
            mainRenderer.clear();
            mainRenderer.drawGrid();
            mainRenderer.drawAxes();
            const dist = DISTRIBUTIONS[state.currentDist];
            mainRenderer.plotDistribution(dist, state.params);
            const mean = dist.mean(state.params);
            const variance = dist.variance(state.params);
            const readout = document.getElementById('brutalReadout');
            if (readout) readout.innerText = `μ ${mean.toFixed(2)}  σ² ${variance.toFixed(2)}`;
        }
        // Compare
        if (state.currentView === 'compare') {
            compareRenderer.resize();
            compareRenderer.clear();
            compareRenderer.drawGrid();
            compareRenderer.drawAxes();
            const d1 = DISTRIBUTIONS[state.compare.dist1];
            const d2 = DISTRIBUTIONS[state.compare.dist2];
            compareRenderer.options.accent = '#FF3E00';
            compareRenderer.plotDistribution(d1, state.compare.params1, true);
            compareRenderer.options.accent = '#0066FF';
            compareRenderer.plotDistribution(d2, state.compare.params2, true);
            const s1 = document.getElementById('compare1Stats');
            const s2 = document.getElementById('compare2Stats');
            if (s1) s1.innerHTML = `μ = ${d1.mean(state.compare.params1).toFixed(3)}`;
            if (s2) s2.innerHTML = `μ = ${d2.mean(state.compare.params2).toFixed(3)}`;
        }
        // View change animation
        if (lastView !== state.currentView) {
            animateView(state.currentView);
            lastView = state.currentView;
        }
    });

    // ── Resize ──
    window.addEventListener('resize', () => {
        mainRenderer.resize();
        compareRenderer.resize();
        store.notify();
    });

    // ── Boot ──
    const hash = window.location.hash.substring(1) || 'home';
    store.switchView(hash);
    lastView = hash;
});
