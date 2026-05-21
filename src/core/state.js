/**
 * Reactive state management using an observer pattern.
 * Coordinates curriculum progress, sandbox settings, calculator variables,
 * quiz sessions, and sampling simulator states.
 */
import { DISTRIBUTIONS } from '../math/dist.js';

class Store {
    constructor() {
        this.subscribers = [];
        this.state = {
            currentView: 'home',
            currentDist: 'normal',
            params: {},
            compare: {
                dist1: 'normal',
                dist2: 'binomial',
                params1: {},
                params2: {}
            },
            compareOverlay: false,
            zoom: 1.0,
            
            // Curriculum progress
            chapters: {
                '1': false,
                '2': false,
                '3': false,
                '4': false
            },
            checkpoints: {
                '1': false,
                '2': false,
                '3': false,
                '4': false
            },
            
            // Quiz Engine state
            quiz: {
                started: false,
                completed: false,
                currentIndex: 0,
                score: 0,
                questions: [],
                selections: [] // User answers
            },

            // Simulator state
            simulator: {
                dist: 'normal',
                params: {},
                sampleSize: 30,
                results: [], // Array of drawn sample means
                isRunning: false
            }
        };

        // Initialize default parameters
        this.initDistParams('normal');
        this.initCompareParams(1, 'normal');
        this.initCompareParams(2, 'binomial');
        this.initSimParams('normal');

        // Load progress from localStorage
        this.load();
    }

    save() {
        localStorage.setItem('learnpd_remake_state', JSON.stringify(this.state));
    }

    load() {
        const saved = localStorage.getItem('learnpd_remake_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge carefully, preserving structure
                this.state = {
                    ...this.state,
                    ...parsed,
                    compare: { ...this.state.compare, ...parsed.compare },
                    chapters: { ...this.state.chapters, ...parsed.chapters },
                    checkpoints: { ...this.state.checkpoints, ...parsed.checkpoints },
                    quiz: { ...this.state.quiz, ...parsed.quiz },
                    simulator: { ...this.state.simulator, ...parsed.simulator }
                };
                
                // Keep routing aligned to location hash
                const hash = window.location.hash.substring(1);
                if (hash) this.state.currentView = hash;
            } catch (e) {
                console.warn('Failed to load state', e);
            }
        }
    }

    initDistParams(distId) {
        const dist = DISTRIBUTIONS[distId];
        this.state.params = {};
        dist.params.forEach(p => {
            this.state.params[p.id] = p.default;
        });
    }

    initCompareParams(which, distId) {
        const dist = DISTRIBUTIONS[distId];
        const target = which === 1 ? 'params1' : 'params2';
        this.state.compare[target] = {};
        dist.params.forEach(p => {
            this.state.compare[target][p.id] = p.default;
        });
    }

    initSimParams(distId) {
        const dist = DISTRIBUTIONS[distId];
        this.state.simulator.params = {};
        dist.params.forEach(p => {
            this.state.simulator.params[p.id] = p.default;
        });
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        // Call immediately with current state
        callback(this.state);
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    notify() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // --- State Mutation Actions ---
    
    switchView(viewId) {
        this.state.currentView = viewId;
        this.notify();
        this.save();
    }

    setDistribution(distId) {
        this.state.currentDist = distId;
        this.initDistParams(distId);
        this.notify();
        this.save();
    }

    updateParam(id, val) {
        this.state.params[id] = parseFloat(val);
        this.notify();
        this.save();
    }

    setCompareDist(which, distId) {
        const target = which === 1 ? 'dist1' : 'dist2';
        this.state.compare[target] = distId;
        this.initCompareParams(which, distId);
        this.notify();
        this.save();
    }

    updateCompareParam(which, id, val) {
        const target = which === 1 ? 'params1' : 'params2';
        this.state.compare[target][id] = parseFloat(val);
        this.notify();
        this.save();
    }

    setCompareOverlay(active) {
        this.state.compareOverlay = !!active;
        this.notify();
        this.save();
    }

    adjustZoom(delta) {
        this.state.zoom = Math.max(0.2, Math.min(5.0, this.state.zoom + delta));
        this.notify();
    }

    // --- Curriculum Progress ---
    
    markChapterCompleted(chId) {
        this.state.chapters[chId] = true;
        this.notify();
        this.save();
    }

    markCheckpointCompleted(chId) {
        this.state.checkpoints[chId] = true;
        this.notify();
        this.save();
    }

    resetAllProgress() {
        this.state.chapters = { '1': false, '2': false, '3': false, '4': false };
        this.state.checkpoints = { '1': false, '2': false, '3': false, '4': false };
        this.state.quiz = { started: false, completed: false, currentIndex: 0, score: 0, questions: [], selections: [] };
        this.state.simulator.results = [];
        this.state.zoom = 1.0;
        this.notify();
        this.save();
    }

    // --- Quiz Session Actions ---

    initQuiz() {
        // Quiz Questions Database
        const questionsList = [
            {
                type: 'mc',
                question: 'Which of the following distributions is famously "memoryless"?',
                options: ['A) Normal', 'B) Binomial', 'C) Exponential', 'D) Poisson'],
                answer: 2,
                explanation: 'The Exponential distribution is memoryless. The probability of an event occurring in the future does not depend on how much time has elapsed.'
            },
            {
                type: 'mc',
                question: 'A Binomial distribution has n = 50 trials and a success probability p = 0.4. What is its expected value (mean)?',
                options: ['A) 12.5', 'B) 20.0', 'C) 30.0', 'D) 10.0'],
                answer: 1,
                explanation: 'The expected value (mean) of a binomial distribution is E(X) = n × p = 50 × 0.4 = 20.0.'
            },
            {
                type: 'mc',
                question: 'According to the Central Limit Theorem, what distribution shape will sample averages take as sample size n grows large?',
                options: ['A) Uniform', 'B) Exponential', 'C) Normal (Gaussian)', 'D) Student\'s T'],
                answer: 2,
                explanation: 'The CLT states that the distribution of sample means approaches a Normal (Gaussian) distribution as sample size n increases (n ≥ 30), regardless of the source distribution shape.'
            },
            {
                type: 'match',
                question: 'Curve Matching: Standardize the active Normal curve to match standard normal N(0, 1) (dotted red line).',
                dist: 'normal',
                targetParams: { mu: 0, sigma: 1 },
                initialParams: { mu: 2, sigma: 2 },
                explanation: 'By setting the mean μ = 0 and standard deviation σ = 1, you successfully standardized the normal distribution curve.'
            },
            {
                type: 'match',
                question: 'Curve Matching: Adjust Poisson parameters (λ) to match the target Poisson rate λ = 8 (dotted red bars).',
                dist: 'poisson',
                targetParams: { lambda: 8 },
                initialParams: { lambda: 2 },
                explanation: 'A Poisson distribution with rate λ = 8 has its peak centered at x = 7 and 8, proving that mean equals rate λ.'
            }
        ];

        this.state.quiz = {
            started: true,
            completed: false,
            currentIndex: 0,
            score: 0,
            questions: questionsList,
            selections: new Array(questionsList.length).fill(null)
        };
        this.notify();
        this.save();
    }

    submitQuizAnswer(answerIndexOrParams) {
        const q = this.state.quiz.questions[this.state.quiz.currentIndex];
        this.state.quiz.selections[this.state.quiz.currentIndex] = answerIndexOrParams;
        
        let isCorrect = false;
        if (q.type === 'mc') {
            isCorrect = (answerIndexOrParams === q.answer);
        } else if (q.type === 'match') {
            // Match is evaluated by client distance, we assume check logic passed before calling
            isCorrect = true;
        }

        if (isCorrect) {
            this.state.quiz.score++;
        }
        
        this.notify();
        this.save();
        return isCorrect;
    }

    advanceQuiz() {
        if (this.state.quiz.currentIndex < this.state.quiz.questions.length - 1) {
            this.state.quiz.currentIndex++;
        } else {
            this.state.quiz.completed = true;
        }
        this.notify();
        this.save();
    }

    // --- Simulator Actions ---
    
    setSimDistribution(distId) {
        this.state.simulator.dist = distId;
        this.initSimParams(distId);
        this.state.simulator.results = [];
        this.notify();
        this.save();
    }

    updateSimParam(id, val) {
        this.state.simulator.params[id] = parseFloat(val);
        this.state.simulator.results = [];
        this.notify();
        this.save();
    }

    setSimSampleSize(size) {
        this.state.simulator.sampleSize = Math.max(2, Math.min(1000, parseInt(size) || 30));
        this.state.simulator.results = [];
        this.notify();
        this.save();
    }

    addSimSample(meanVal) {
        this.state.simulator.results.push(meanVal);
        this.notify();
        // Don't save large results array in localStorage to prevent bloat
    }

    clearSim() {
        this.state.simulator.results = [];
        this.notify();
    }
}

export const store = new Store();