/**
 * LearnPD - Professional Entry Point
 */
import { UI } from './src/ui/controller.js';
import { Renderer } from './src/renderer/canvas.js';
import { store } from './src/core/state.js';
import { DISTRIBUTIONS } from './src/math/dist.js';

document.addEventListener('DOMContentLoaded', () => {
    const ui = new UI();
    const mainRenderer = new Renderer('mainCanvas');

    // Subscribe renderer to store
    store.subscribe((state) => {
        if (state.currentView === 'explorer') {
            mainRenderer.clear();
            mainRenderer.drawGrid();
            mainRenderer.drawAxes();

            const dist = DISTRIBUTIONS[state.currentDist];
            const stats = mainRenderer.plotDistribution(dist, state.params);

            // Update readout
            const mean = dist.mean(state.params);
            const variance = dist.variance(state.params);
            const readout = document.getElementById('brutalReadout');
            if (readout) {
                readout.innerText = `MEAN: ${mean.toFixed(2)} | VAR: ${variance.toFixed(2)}`;
            }
        }
    });

    // Handle resize
    window.addEventListener('resize', () => {
        mainRenderer.resize();
        store.notify(); // Force redraw
    });

    // Initial boot
    const hash = window.location.hash.substring(1) || 'home';
    store.switchView(hash);
});
