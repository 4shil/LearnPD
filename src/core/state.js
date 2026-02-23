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
    }

    save() {
        localStorage.setItem('learnpd_remake_state', JSON.stringify(this.state));
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
        this.state.simulator.results = [];
        this.state.zoom = 1.0;
        this.notify();
        this.save();
    }

    // --- Quiz Session Actions ---



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