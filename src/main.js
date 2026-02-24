/**
 * LearnPD - Professional Entry Point
 */
import { UI } from './ui/controller.js';
import { Renderer } from './renderer/canvas.js';
import { store } from './core/state.js';
import { DISTRIBUTIONS } from './math/dist.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // Entrance Animation (Brutalist)
    const TlEntrance = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    TlEntrance.fromTo('.loader-text', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 })
        .to('.loader-text', { x: 50, opacity: 0, duration: 0.4, delay: 0.2 })
        .to('.pre-loader', { y: '-100%', duration: 0.8, ease: 'expo.inOut' })
        .set('.pre-loader', { display: 'none' });

    const ui = new UI();

    // Initialize Lenis
    const lenis = new Lenis();
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Custom Cursor Logic
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    window.addEventListener('mousemove', (e) => {
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.05, // Much faster
            ease: 'none'
        });
    });

    const mainRenderer = new Renderer('mainCanvas');
    const compareRenderer = new Renderer('compareCanvas', { accent: '#FF3E00' });

    // View Entry Animations
    const animateView = (viewId) => {
        gsap.fromTo(`#${viewId} > *`,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power4.out', delay: 0.2 }
        );
    };

    // Subscribe renderer to store
    store.subscribe((state) => {
        if (state.currentView === 'explorer') {
            mainRenderer.clear();
            mainRenderer.drawGrid();
            mainRenderer.drawAxes();

            const dist = DISTRIBUTIONS[state.currentDist];
            mainRenderer.plotDistribution(dist, state.params);

            // Update readout
            const mean = dist.mean(state.params);
            const varVal = dist.variance(state.params);
            const readout = document.getElementById('brutalReadout');
            if (readout) {
                readout.innerText = `MEAN: ${mean.toFixed(2)} | VAR: ${varVal.toFixed(2)}`;
            }
        } else if (state.currentView === 'compare') {
            compareRenderer.clear();
            compareRenderer.drawGrid();
            compareRenderer.drawAxes();

            const d1 = DISTRIBUTIONS[state.compare.dist1];
            const d2 = DISTRIBUTIONS[state.compare.dist2];

            compareRenderer.options.accent = '#FF3E00'; // Reddish
            compareRenderer.plotDistribution(d1, state.compare.params1, true);

            compareRenderer.options.accent = '#0066FF'; // Bluish
            compareRenderer.plotDistribution(d2, state.compare.params2, true);

            // Update stats
            const s1 = document.getElementById('compare1Stats');
            const s2 = document.getElementById('compare2Stats');
            if (s1) s1.innerHTML = `MEAN: ${d1.mean(state.compare.params1).toFixed(2)}`;
            if (s2) s2.innerHTML = `MEAN: ${d2.mean(state.compare.params2).toFixed(2)}`;
        }

        // Trigger view animation if the view changed
        if (ui.lastView !== state.currentView) {
            animateView(state.currentView);
            ui.lastView = state.currentView;
        }
    });

    // Handle resize
    window.addEventListener('resize', () => {
        mainRenderer.resize();
        compareRenderer.resize();
        store.notify(); // Force redraw
    });

    // Initial boot
    const hash = window.location.hash.substring(1) || 'home';
    store.switchView(hash);
    ui.lastView = hash;

    // Dynamic magnetic attachment
    const observer = new MutationObserver(() => {
        applyMagnetic();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function applyMagnetic() {
        document.querySelectorAll('.btn, .nav-link, button, select').forEach(el => {
            if (el.dataset.magnetic) return;
            el.dataset.magnetic = "true";

            el.addEventListener('mouseenter', () => {
                gsap.to(cursor, { scale: 3, duration: 0.3 });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(cursor, { scale: 1, duration: 0.3 });
            });

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(el, {
                    x: x * 0.3,
                    y: y * 0.3,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
            });
        });
    }
    applyMagnetic();
});
