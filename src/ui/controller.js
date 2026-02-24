/**
 * UI Controller for DOM interactions and component updates.
 */
import { store } from '../core/state.js';
import { DISTRIBUTIONS } from '../math/dist.js';

export class UI {
    constructor() {
        this.initEventListeners();
        this.bindStore();
    }

    initEventListeners() {
        // Nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const viewId = link.getAttribute('href').substring(1);
                store.switchView(viewId);
            });
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'home';
            store.switchView(hash);
        });

        // Distribution toggle in Explorer
        const distSelect = document.getElementById('distSelect');
        if (distSelect) {
            distSelect.addEventListener('change', (e) => {
                store.setDistribution(e.target.value);
            });
        }
    }

    bindStore() {
        store.subscribe((state) => {
            this.updateView(state.currentView);
            this.updateExplorerUI(state);
            // More updates will be added as we refactor other sections
        });
    }

    updateView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === viewId);
        });

        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === `#${viewId}`);
        });
    }

    updateExplorerUI(state) {
        const dist = DISTRIBUTIONS[state.currentDist];
        const sliderContainer = document.getElementById('paramSliders');
        if (!sliderContainer) return;

        // Only rebuild sliders if the distribution changed
        if (sliderContainer.dataset.dist !== state.currentDist) {
            sliderContainer.dataset.dist = state.currentDist;
            sliderContainer.innerHTML = '';

            dist.params.forEach(p => {
                const div = document.createElement('div');
                div.className = 'param-control';
                div.innerHTML = `
                    <label><span>${p.label}</span> <span id="val-${p.id}">${state.params[p.id]}</span></label>
                    <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${state.params[p.id]}" id="input-${p.id}">
                `;

                const input = div.querySelector('input');
                input.addEventListener('input', (e) => {
                    store.updateParam(p.id, e.target.value);
                    document.getElementById(`val-${p.id}`).innerText = e.target.value;
                });

                sliderContainer.appendChild(div);
            });

            // Update info cards
            document.getElementById('whatText').innerText = dist.what;
            document.getElementById('whenText').innerText = dist.when;
            document.getElementById('mechanicsText').innerText = dist.mechanics;
            document.getElementById('formulaBox').innerText = dist.formula;
        }
    }
}
