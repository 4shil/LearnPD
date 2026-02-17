/**
 * UI Controller for DOM interactions and component updates.
 * Manages event routing, sliders, quiz controllers, sampling stats, and export hooks.
 */
import { store } from '../core/state.js';
import { DISTRIBUTIONS } from '../math/dist.js';

export class UI {
    constructor() {
        this.initGeneralListeners();
        this.initChapterListeners();
        this.initExplorerListeners();
        this.initCalculatorListeners();
        this.bindStore();
    }

    initGeneralListeners() {
        // Bottom Navigation Dock View Routing
        document.querySelectorAll('.dock__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.dataset.view || link.getAttribute('href').substring(1);
                window.location.hash = `#${viewId}`;
            });
        });

        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'home';
            store.switchView(hash);
        });
    }

    initChapterListeners() {
        // Chapters Sidebar selection click
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', () => {
                const chId = item.dataset.chapter;
                this.switchChapterPane(chId);
            });
        });

        // Next Chapter navigation buttons
        document.querySelectorAll('.next-chapter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextChId = btn.dataset.next;
                this.switchChapterPane(nextChId);
                // Highlight corresponding sidebar card
                document.querySelectorAll('.chapter-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.chapter === nextChId);
                });
            });
        });

        // Inline checkpoint question answers
        document.querySelectorAll('.practice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const isCorrect = btn.dataset.correct === 'true';
                const parent = btn.closest('.practice-box');
                const feedback = parent.querySelector('.practice__feedback');
                const chPane = btn.closest('.chapter-pane');
                const chId = chPane.id.replace('pane-chapter-', '');

                feedback.classList.remove('hidden', 'correct', 'incorrect');
                if (isCorrect) {
                    feedback.innerText = 'Correct! Great job. Checkpoint completed.';
                    feedback.classList.add('correct');
                    store.markCheckpointCompleted(chId);
                    store.markChapterCompleted(chId);
                } else {
                    feedback.innerText = 'Incorrect. Try again!';
                    feedback.classList.add('incorrect');
                }
            });
        });
    }

    switchChapterPane(chId) {
        document.querySelectorAll('.chapter-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-chapter-${chId}`);
        });
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chapter === chId);
        });
        store.markChapterCompleted(chId);
    }

    initExplorerListeners() {

        // Show/Hide Formula toggle
        const mathToggles = document.querySelectorAll('.math-toggle');
        mathToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const box = toggle.parentElement.querySelector('.formula-box') || document.getElementById('formulaBox');
                if (box) {
                    box.classList.toggle('hidden');
                    toggle.innerText = box.classList.contains('hidden') ? 'SHOW FORMULA' : 'HIDE FORMULA';
                }
            });
        });

        // Reset parameters slider values
        const resetBtn = document.getElementById('btnResetParams');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                store.initDistParams(store.state.currentDist);
                store.notify();
            });
        }

        // Split-screen comparison checkbox toggle
        const compareChk = document.getElementById('chkCompareOverlay');
        if (compareChk) {
            compareChk.addEventListener('change', (e) => {
                store.setCompareOverlay(e.target.checked);
            });
        }

        // Compare dropdowns
        const c1Select = document.getElementById('compare1Select');
        const c2Select = document.getElementById('compare2Select');
        if (c1Select) c1Select.addEventListener('change', (e) => store.setCompareDist(1, e.target.value));
        if (c2Select) c2Select.addEventListener('change', (e) => store.setCompareDist(2, e.target.value));

        // Export Curves to CSV
        const exportCsvBtn = document.getElementById('btnExportCsv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCsvData());
        }

        // PNG Chart Download
        const downloadPngBtn = document.getElementById('btnDownloadChart');
        if (downloadPngBtn) {
            downloadPngBtn.addEventListener('click', () => this.downloadChartPng());
        }

        // Canvas Zoom
    }

    initCalculatorListeners() {
        const calcSelect = document.getElementById('calcDistSelect');
        if (calcSelect) {
            calcSelect.addEventListener('change', () => this.updateCalcParams());
            this.updateCalcParams();
        }

        document.querySelectorAll('input[name="calcType"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateCalcType());
        });

        const calcBtn = document.querySelector('.btn-calc');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.calculate());
        }
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
        const container = document.getElementById('paramSliders');
        if (!container) return;

        // Select correct value in dropdown
        const select = document.getElementById('distSelect');
        if (select && select.value !== state.currentDist) {
            select.value = state.currentDist;
        }

        // Rebuild sliders only if the distribution selected changes
        if (container.dataset.dist !== state.currentDist) {
            container.dataset.dist = state.currentDist;
            container.innerHTML = '';

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

                container.appendChild(div);
            });

            // Update details texts
            document.getElementById('whatText').innerText = dist.what;
            document.getElementById('whenText').innerText = dist.when;
            document.getElementById('mechanicsText').innerText = dist.mechanics;
            
            const formula = document.getElementById('formulaBox');
            formula.innerText = dist.formula;
        } else {
            // Update slider thumb values if state was modified externally (like reset)
            dist.params.forEach(p => {
                const valSpan = document.getElementById(`val-${p.id}`);
                const input = document.getElementById(`input-${p.id}`);
                if (valSpan && input) {
                    valSpan.innerText = state.params[p.id];
                    input.value = state.params[p.id];
                }
            });
        }

        // Show comparison card check matches overlay state
        const compareChk = document.getElementById('chkCompareOverlay');
        if (compareChk) {
            compareChk.checked = state.compareOverlay;
        }
    }

    updateCompareUI(state) {
        if (state.currentView !== 'compare') return;

        [1, 2].forEach(num => {
            const distId = state.compare[`dist${num}`];
            const dist = DISTRIBUTIONS[distId];
            const container = document.getElementById(`compare${num}Params`);
            if (!container) return;

            // Update dropdown values
            const select = document.getElementById(`compare${num}Select`);
            if (select && select.value !== distId) select.value = distId;

            if (container.dataset.dist !== distId) {
                container.dataset.dist = distId;
                container.innerHTML = '';

                dist.params.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'param-control';
                    div.innerHTML = `
                        <label><span>${p.label}</span> <span id="compare${num}_val_${p.id}">${state.compare[`params${num}`][p.id]}</span></label>
                        <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${state.compare[`params${num}`][p.id]}" id="compare${num}_input_${p.id}">
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
        // Sub-elements are populated on-demand or by local listeners
    }

    updateCalcParams() {
        const distId = document.getElementById('calcDistSelect').value;
        const dist = DISTRIBUTIONS[distId];
        const container = document.getElementById('calcParams');
        if (!container) return;

        container.innerHTML = '';
        dist.params.forEach(p => {
            const div = document.createElement('div');
            div.style.marginBottom = '0.5rem';
            div.innerHTML = `
                <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--muted); margin-bottom:0.25rem;">${p.label}:</label>
                <input type="number" id="calcParam_${p.id}" value="${p.default}" step="${p.step}" style="width:100%; padding:8px 12px; font-family:'JetBrains Mono', monospace; font-weight:bold; border:var(--border-w) solid var(--border); border-radius:var(--radius-sm); box-shadow:2px 2px 0 var(--border);">
            `;
            container.appendChild(div);
        });
    }

    updateCalcType() {
        const calcType = document.querySelector('input[name="calcType"]:checked')?.value;
        const inputsDiv = document.getElementById('calcInputs');
        if (!inputsDiv) return;

        if (calcType === 'interval') {
            inputsDiv.innerHTML = `
                <label>Lower bound (a):</label>
                <input type="number" id="calcA" step="0.1" value="-1">
                <label>Upper bound (b):</label>
                <input type="number" id="calcB" step="0.1" value="1">
            `;
        } else {
            inputsDiv.innerHTML = `
                <label>Value (x):</label>
                <input type="number" id="calcX" step="0.1" value="0">
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
                result = `${dist.isDiscrete ? 'P(X = ' + x + ')' : 'f(' + x + ')'} = ${val.toFixed(6)}`;
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





    // --- CSV data exporter ---

    // --- PNG download exporter ---
}