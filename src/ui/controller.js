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
        document.querySelectorAll('.dock__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.dataset.view || link.getAttribute('href').substring(1);
                store.switchView(viewId);
            });
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'home';
            store.switchView(hash);
        });

        // Calculator
        const calcSelect = document.getElementById('calcDistSelect');
        if (calcSelect) {
            calcSelect.addEventListener('change', (e) => this.updateCalcParams());
            this.updateCalcParams(); // Initial populate
        }

        document.querySelectorAll('input[name="calcType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateCalcType());
        });

        const calcBtn = document.querySelector('.btn-calc');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.calculate());
        }

        const mathToggle = document.querySelector('.math-toggle');
        if (mathToggle) {
            mathToggle.addEventListener('click', () => {
                const box = document.getElementById('formulaBox');
                box.classList.toggle('hidden');
                mathToggle.innerText = box.classList.contains('hidden') ? 'SHOW FORMULA' : 'HIDE FORMULA';
            });
        }

        // Compare
        const compare1Select = document.getElementById('compare1Select');
        const compare2Select = document.getElementById('compare2Select');
        if (compare1Select) compare1Select.addEventListener('change', (e) => store.setCompareDist(1, e.target.value));
        if (compare2Select) compare2Select.addEventListener('change', (e) => store.setCompareDist(2, e.target.value));
    }

    bindStore() {
        store.subscribe((state) => {
            this.updateView(state.currentView);
            this.updateExplorerUI(state);
            this.updateCompareUI(state);
            this.updateCalculatorUI(state);
        });
    }

    updateView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === viewId);
        });

        document.querySelectorAll('.dock__link').forEach(l => {
            const linkView = l.dataset.view || l.getAttribute('href').substring(1);
            l.classList.toggle('active', linkView === viewId);
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

    updateCompareUI(state) {
        if (state.currentView !== 'compare') return;

        [1, 2].forEach(num => {
            const distId = state.compare[`dist${num}`];
            const dist = DISTRIBUTIONS[distId];
            const container = document.getElementById(`compare${num}Params`);
            if (!container) return;

            if (container.dataset.dist !== distId) {
                container.dataset.dist = distId;
                container.innerHTML = '';

                dist.params.forEach(p => {
                    const div = document.createElement('div');
                    div.style.marginBottom = '1rem';
                    div.innerHTML = `
                        <label style="display:block; margin-bottom:0.5rem; font-weight:bold;">${p.label}: <span id="compare${num}_val_${p.id}">${state.compare[`params${num}`][p.id]}</span></label>
                        <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${state.compare[`params${num}`][p.id]}" 
                            style="width:100%; height:20px; border:var(--border-width) solid var(--fg); background:var(--bg);">
                    `;

                    const input = div.querySelector('input');
                    input.addEventListener('input', (e) => {
                        store.updateCompareParam(num, p.id, e.target.value);
                        document.getElementById(`compare${num}_val_${p.id}`).innerText = e.target.value;
                    });

                    container.appendChild(div);
                });
            }
        });
    }

    updateCalculatorUI(state) {
        // Placeholder for calculator specific reactive updates if needed
    }

    updateCalcParams() {
        const distId = document.getElementById('calcDistSelect').value;
        const dist = DISTRIBUTIONS[distId];
        const container = document.getElementById('calcParams');
        if (!container) return;

        container.innerHTML = '';
        dist.params.forEach(p => {
            const label = document.createElement('label');
            label.innerText = p.label + ':';
            const input = document.createElement('input');
            input.type = 'number';
            input.id = 'calcParam_' + p.id;
            input.value = p.default;
            input.step = p.step;
            container.appendChild(label);
            container.appendChild(input);
        });
    }

    updateCalcType() {
        const calcType = document.querySelector('input[name="calcType"]:checked')?.value;
        const inputsDiv = document.getElementById('calcInputs');
        if (!inputsDiv) return;

        if (calcType === 'interval') {
            inputsDiv.innerHTML = `
                <label>Lower bound (a):</label>
                <input type="number" id="calcA" step="0.01" value="0">
                <label>Upper bound (b):</label>
                <input type="number" id="calcB" step="0.01" value="1">
            `;
        } else if (calcType === 'quantile') {
            inputsDiv.innerHTML = `
                <label>Probability (p):</label>
                <input type="number" id="calcP" step="0.01" min="0" max="1" value="0.5">
            `;
        } else {
            inputsDiv.innerHTML = `
                <label>Value (x):</label>
                <input type="number" id="calcX" step="0.01" value="0">
            `;
        }
    }

    calculate() {
        const distId = document.getElementById('calcDistSelect').value;
        const dist = DISTRIBUTIONS[distId];
        const calcType = document.querySelector('input[name="calcType"]:checked')?.value;
        const resultDiv = document.getElementById('calcResult');

        const p = {};
        dist.params.forEach(param => {
            const input = document.getElementById('calcParam_' + param.id);
            if (input) p[param.id] = parseFloat(input.value);
        });

        let result = '';
        try {
            if (calcType === 'pdf') {
                const x = parseFloat(document.getElementById('calcX').value);
                const val = dist.isDiscrete ? dist.pmf(x, p) : dist.pdf(x, p);
                result = `${dist.isDiscrete ? 'P(X=' + x + ')' : 'f(' + x + ')'} = ${val.toFixed(6)}`;
            } else if (calcType === 'cdf') {
                const x = parseFloat(document.getElementById('calcX').value);
                const val = dist.cdf(x, p);
                result = `P(X ≤ ${x}) = ${val.toFixed(6)}`;
            } else if (calcType === 'interval') {
                const a = parseFloat(document.getElementById('calcA').value);
                const b = parseFloat(document.getElementById('calcB').value);
                const val = dist.cdf(b, p) - dist.cdf(a, p);
                result = `P(${a} ≤ X ≤ ${b}) = ${val.toFixed(6)}`;
            }
        } catch (e) {
            result = 'Error: ' + e.message;
        }
        if (resultDiv) resultDiv.innerText = result;
    }
}
