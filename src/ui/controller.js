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
        this.initQuizListeners();
        this.initSimulatorListeners();
        this.initProgressListeners();
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
        const distSelect = document.getElementById('distSelect');
        if (distSelect) {
            distSelect.addEventListener('change', (e) => {
                store.setDistribution(e.target.value);
            });
        }

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
        const zoomIn = document.getElementById('btnZoomIn');
        const zoomOut = document.getElementById('btnZoomOut');
        if (zoomIn) zoomIn.addEventListener('click', () => store.adjustZoom(-0.1)); // Zoom in expands curve bounds
        if (zoomOut) zoomOut.addEventListener('click', () => store.adjustZoom(0.1));
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

    initQuizListeners() {
        const startBtnBig = document.getElementById('btnStartQuizBig');
        const startBtnSide = document.getElementById('btnStartQuiz');
        const restartBtn = document.getElementById('btnRestartQuiz');

        const launchQuiz = () => {
            store.initQuiz();
            document.getElementById('quizWelcomeCard').classList.add('hidden');
            document.getElementById('quizScoreCard').classList.add('hidden');
            document.getElementById('quizCard').classList.remove('hidden');
        };

        if (startBtnBig) startBtnBig.addEventListener('click', launchQuiz);
        if (startBtnSide) startBtnSide.addEventListener('click', launchQuiz);
        if (restartBtn) restartBtn.addEventListener('click', launchQuiz);

        // Submit answer button
        const submitBtn = document.getElementById('btnSubmitAnswer');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitQuizValue());
        }

        // Next question click
        const nextBtn = document.getElementById('btnNextQuestion');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                store.advanceQuiz();
                submitBtn.classList.remove('hidden');
                nextBtn.classList.add('hidden');
                document.getElementById('quizFeedbackBox').classList.add('hidden');
            });
        }
    }


    initSimulatorListeners() {
        const simSelect = document.getElementById('simDistSelect');
        if (simSelect) {
            simSelect.addEventListener('change', (e) => {
                store.setSimDistribution(e.target.value);
            });
            // Initial call to populate parameters
            store.setSimDistribution(simSelect.value);
        }

        const simSize = document.getElementById('simSampleSize');
        if (simSize) {
            simSize.addEventListener('change', (e) => {
                store.setSimSampleSize(e.target.value);
            });
        }

        const clearBtn = document.getElementById('btnClearSim');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => store.clearSim());
        }
    }


    initProgressListeners() {
        const resetProgressBtn = document.getElementById('btnResetProgress');
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your learning records?')) {
                    store.resetAllProgress();
                }
            });
        }
    }


    bindStore() {
        store.subscribe((state) => {
            this.updateView(state.currentView);
            this.updateExplorerUI(state);
            this.updateCompareUI(state);
            this.updateCalculatorUI(state);
            this.updateQuizUI(state);
            this.updateSimulatorUI(state);
            this.updateProgressUI(state);
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

    updateQuizUI(state) {
        if (state.currentView !== 'quiz') return;

        const quiz = state.quiz;
        
        // Progress Sidebar
        const progressFill = document.getElementById('quizProgressFill');
        if (progressFill) {
            const percent = quiz.started ? ((quiz.currentIndex) / quiz.questions.length) * 100 : 0;
            progressFill.style.width = quiz.completed ? '100%' : `${percent}%`;
        }

        const qNumSpan = document.getElementById('quizCurrentNum');
        if (qNumSpan) {
            qNumSpan.innerText = quiz.started ? `${Math.min(quiz.currentIndex + 1, quiz.questions.length)}/${quiz.questions.length}` : '0/5';
        }

        const scoreSpan = document.getElementById('quizScore');
        if (scoreSpan) {
            scoreSpan.innerText = `${quiz.score}/${quiz.started ? quiz.currentIndex : 0}`;
        }

        // Show correct screen states
        const welcome = document.getElementById('quizWelcomeCard');
        const qCard = document.getElementById('quizCard');
        const scoreCard = document.getElementById('quizScoreCard');

        if (!quiz.started) {
            welcome.classList.remove('hidden');
            qCard.classList.add('hidden');
            scoreCard.classList.add('hidden');
        } else if (quiz.completed) {
            welcome.classList.add('hidden');
            qCard.classList.add('hidden');
            scoreCard.classList.remove('hidden');
            
            const title = document.getElementById('quizScoreTitle');
            const body = document.getElementById('quizScoreBody');
            
            if (quiz.score === quiz.questions.length) {
                title.innerText = 'Perfect Score! 🏆';
                body.innerText = `You scored ${quiz.score}/${quiz.questions.length}! You have mastered probability distributions and unlocked the final badge.`;
                store.markCheckpointCompleted('4'); // Unlocks master badge
            } else {
                title.innerText = 'Quiz Completed';
                body.innerText = `You scored ${quiz.score}/${quiz.questions.length}. Get 5/5 to claim your master badge!`;
            }
        } else {
            welcome.classList.add('hidden');
            qCard.classList.remove('hidden');
            scoreCard.classList.add('hidden');

            // Render active question
            const q = quiz.questions[quiz.currentIndex];
            document.getElementById('quizQIndex').innerText = `Q${quiz.currentIndex + 1}`;
            document.getElementById('quizQuestionText').innerText = q.question;

            const mcOptionsList = document.getElementById('quizOptionsList');
            const matchingArea = document.getElementById('quizMatchingArea');

            if (q.type === 'mc') {
                mcOptionsList.classList.remove('hidden');
                matchingArea.classList.add('hidden');
                document.getElementById('quizQType').innerText = 'Multiple Choice';

                mcOptionsList.innerHTML = '';
                q.options.forEach((opt, idx) => {
                    const btn = document.createElement('button');
                    btn.className = `quiz-option-btn card ${quiz.selections[quiz.currentIndex] === idx ? 'selected' : ''}`;
                    btn.innerText = opt;
                    
                    btn.addEventListener('click', () => {
                        // Mark active selection in local node structure before submission
                        document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        quiz.selections[quiz.currentIndex] = idx;
                    });
                    
                    mcOptionsList.appendChild(btn);
                });
            } else if (q.type === 'match') {
                mcOptionsList.classList.add('hidden');
                matchingArea.classList.remove('hidden');
                document.getElementById('quizQType').innerText = 'Interactive Matching';

                // Initial setup of matching parameters state if null
                if (quiz.selections[quiz.currentIndex] === null) {
                    quiz.selections[quiz.currentIndex] = { ...q.initialParams };
                }

                // Render matching sliders inside container
                const slidersDiv = document.getElementById('quizMatchingSliders');
                slidersDiv.innerHTML = '';
                const activeParams = quiz.selections[quiz.currentIndex];
                const distObj = DISTRIBUTIONS[q.dist];

                distObj.params.forEach(p => {
                    const controlDiv = document.createElement('div');
                    controlDiv.className = 'param-control';
                    controlDiv.innerHTML = `
                        <label><span>${p.label}</span> <span id="match-val-${p.id}">${activeParams[p.id]}</span></label>
                        <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${activeParams[p.id]}" id="match-input-${p.id}">
                    `;

                    const input = controlDiv.querySelector('input');
                    input.addEventListener('input', (e) => {
                        activeParams[p.id] = parseFloat(e.target.value);
                        document.getElementById(`match-val-${p.id}`).innerText = e.target.value;
                        store.notify(); // Re-trigger canvas draws
                    });

                    slidersDiv.appendChild(controlDiv);
                });
            }
        }
    }


    submitQuizValue() {
        const quiz = store.state.quiz;
        const qIndex = quiz.currentIndex;
        const q = quiz.questions[qIndex];
        const selection = quiz.selections[qIndex];

        if (selection === null) {
            alert('Please select an option or adjust sliders before submitting.');
            return;
        }

        let isCorrect = false;
        if (q.type === 'mc') {
            isCorrect = store.submitQuizAnswer(selection);
        } else if (q.type === 'match') {
            // Evaluate curve matching distance
            const distObj = DISTRIBUTIONS[q.dist];
            let error = 0;
            distObj.params.forEach(p => {
                error += Math.pow(selection[p.id] - q.targetParams[p.id], 2);
            });
            error = Math.sqrt(error);
            
            // Accept match if parameter Euclidean distance is below 0.1
            isCorrect = (error <= 0.15);
            store.submitQuizAnswer(selection);
        }

        // Show Feedback details
        const feedback = document.getElementById('quizFeedbackBox');
        feedback.classList.remove('hidden');
        
        const status = feedback.querySelector('.feedback-status');
        status.classList.remove('correct', 'incorrect');
        if (isCorrect) {
            status.innerText = 'CORRECT!';
            status.classList.add('correct');
        } else {
            status.innerText = 'INCORRECT';
            status.classList.add('incorrect');
        }

        feedback.querySelector('.feedback-text').innerText = q.explanation;

        document.getElementById('btnSubmitAnswer').classList.add('hidden');
        document.getElementById('btnNextQuestion').classList.remove('hidden');
    }


    updateSimulatorUI(state) {
        const sim = state.simulator;
        const select = document.getElementById('simDistSelect');
        if (select && select.value !== sim.dist) {
            select.value = sim.dist;
        }

        const paramsDiv = document.getElementById('simParams');
        if (paramsDiv && paramsDiv.dataset.dist !== sim.dist) {
            paramsDiv.dataset.dist = sim.dist;
            paramsDiv.innerHTML = '';
            
            const distObj = DISTRIBUTIONS[sim.dist];
            distObj.params.forEach(p => {
                const div = document.createElement('div');
                div.className = 'param-control';
                div.innerHTML = `
                    <label><span>${p.label}</span> <span id="sim-val-${p.id}">${sim.params[p.id]}</span></label>
                    <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${sim.params[p.id]}" id="sim-input-${p.id}">
                `;

                const input = div.querySelector('input');
                input.addEventListener('input', (e) => {
                    store.updateSimParam(p.id, e.target.value);
                    document.getElementById(`sim-val-${p.id}`).innerText = e.target.value;
                });

                paramsDiv.appendChild(div);
            });
        }

        // Update stats readouts
        document.getElementById('simReadout').innerText = `Sample Means: ${sim.results.length}`;
    }


    updateProgressUI(state) {
        // Overall Dashboard Dial
        let completedChaptersCount = 0;
        let completedCheckpointsCount = 0;
        
        Object.keys(state.chapters).forEach(k => {
            if (state.chapters[k]) completedChaptersCount++;
            if (state.checkpoints[k]) completedCheckpointsCount++;
        });

        // 4 chapters, 4 checkpoints, 1 quiz. Let's calculate total weight
        const totalSteps = 9;
        let stepsTaken = completedChaptersCount + completedCheckpointsCount;
        if (state.quiz.completed && state.quiz.score === state.quiz.questions.length) {
            stepsTaken += 1;
        }
        const percentage = Math.round((stepsTaken / totalSteps) * 100);

        const dialText = document.getElementById('dashTotalPercent');
        if (dialText) dialText.innerText = `${percentage}%`;

        const chSpan = document.getElementById('dashChaptersRead');
        if (chSpan) chSpan.innerText = `${completedChaptersCount}/4`;

        const chkSpan = document.getElementById('dashCheckpointsDone');
        if (chkSpan) chkSpan.innerText = `${completedCheckpointsCount}/4`;

        const quizSpan = document.getElementById('dashQuizScore');
        if (quizSpan) {
            const highscore = localStorage.getItem('learnpd_remake_quiz_highscore') || (state.quiz.completed ? state.quiz.score : 0);
            if (state.quiz.completed && state.quiz.score > parseInt(highscore)) {
                localStorage.setItem('learnpd_remake_quiz_highscore', state.quiz.score);
            }
            quizSpan.innerText = `${Math.max(state.quiz.score, parseInt(highscore) || 0)}/5`;
        }

        // Badges Lock States toggling
        const toggleBadge = (elId, condition) => {
            const el = document.getElementById(elId);
            if (el) {
                el.classList.toggle('locked', !condition);
            }
        };

        toggleBadge('badgeFoundations', state.checkpoints['1']);
        toggleBadge('badgeDiscrete', state.checkpoints['2']);
        toggleBadge('badgeContinuous', state.checkpoints['3']);
        toggleBadge('badgeSimulator', state.checkpoints['4']);
        toggleBadge('badgeMaster', state.quiz.completed && state.quiz.score === 5);
    }


    // --- CSV data exporter ---
    exportCsvData() {
        const state = store.state;
        const dist = DISTRIBUTIONS[state.currentDist];
        
        let xMin = dist.range.min;
        let xMax = dist.range.max;
        
        if (dist.autoScaleX && dist.isDiscrete) {
            const mean = dist.mean(state.params);
            const std = Math.sqrt(dist.variance(state.params)) || 1;
            xMin = Math.max(dist.range.min, Math.floor(mean - 4 * std));
            xMax = Math.min(dist.range.max, Math.ceil(mean + 4 * std));
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Distribution,${dist.name}\n`;
        csvContent += `Parameters,${JSON.stringify(state.params).replace(/,/g, ';')}\n\n`;
        csvContent += "X,Probability Density (PDF/PMF),Cumulative Density (CDF)\n";

        if (dist.isDiscrete) {
            for (let k = Math.floor(xMin); k <= Math.ceil(xMax); k++) {
                const pdf = dist.pmf(k, state.params);
                const cdf = dist.cdf(k, state.params);
                csvContent += `${k},${pdf.toFixed(8)},${cdf.toFixed(8)}\n`;
            }
        } else {
            const steps = 200;
            for (let i = 0; i <= steps; i++) {
                const x = xMin + (i / steps) * (xMax - xMin);
                const pdf = dist.pdf(x, state.params);
                const cdf = dist.cdf(x, state.params);
                csvContent += `${x.toFixed(6)},${pdf.toFixed(8)},${cdf.toFixed(8)}\n`;
            }
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `learnpd_${state.currentDist}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // --- PNG download exporter ---
    downloadChartPng() {
        const canvas = document.getElementById('mainCanvas');
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `learnpd_${store.state.currentDist}_chart.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}