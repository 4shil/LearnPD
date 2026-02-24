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
            duration: 0.1,
            ease: 'power2.out'
        });
    });

    document.querySelectorAll('a, button, input, select').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-active');
            gsap.to(cursor, { scale: 3, duration: 0.3 });
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-active');
            gsap.to(cursor, { scale: 1, duration: 0.3 });
        });

        // Magnetic Effect
        if (el.classList.contains('btn') || el.classList.contains('nav-link')) {
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
        }
    });

    // View Entry Animations
    store.subscribe((state) => {
        gsap.from('.view.active > *', {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power4.out',
            clearProps: 'all'
        });
    });

    const mainRenderer = new Renderer('mainCanvas');
    const compareRenderer = new Renderer('compareCanvas', { accent: '#FF0000' });

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
});
