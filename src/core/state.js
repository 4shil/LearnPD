/**
 * Reactive state management using an observer pattern.
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
            mathVisible: false
        };

        // Initialize defaults
        this.initDistParams('normal');
        this.initCompareParams(1, 'normal');
        this.initCompareParams(2, 'binomial');
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

    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    notify() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    updateParam(id, val) {
        this.state.params[id] = parseFloat(val);
        this.notify();
    }

    updateCompareParam(which, id, val) {
        const target = which === 1 ? 'params1' : 'params2';
        this.state.compare[target][id] = parseFloat(val);
        this.notify();
    }

    switchView(viewId) {
        this.state.currentView = viewId;
        this.notify();
    }

    setDistribution(distId) {
        this.state.currentDist = distId;
        this.initDistParams(distId);
        this.notify();
    }

    setCompareDist(which, distId) {
        const target = which === 1 ? 'dist1' : 'dist2';
        this.state.compare[target] = distId;
        this.initCompareParams(which, distId);
        this.notify();
    }
}

export const store = new Store();
