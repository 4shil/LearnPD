/**
 * Mathematical utilities and probability distribution logic.
 */

// MATH UTILS
export const factorial = (n) => {
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Basic limit for 64-bit float
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
};

export const combinations = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    
    // For large n, use log-gamma or Stirling approximation for better stability
    // but here we keep the original logic for compatibility unless it fails
    if (n > 170) {
        let logResult = 0;
        for (let i = 0; i < k; i++) {
            logResult += Math.log(n - i) - Math.log(i + 1);
        }
        return Math.exp(logResult);
    }
    
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - i + 1) / i;
    }
    return res;
};

export const erf = (x) => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
};

// DISTRIBUTIONS DEFINITION
export const DISTRIBUTIONS = {
    normal: {
        id: 'normal',
        name: 'NORMAL (GAUSSIAN)',
        params: [
            { id: 'mu', label: 'μ (Mean)', min: -10, max: 10, step: 0.1, default: 0 },
            { id: 'sigma', label: 'σ (Std Dev)', min: 0.1, max: 5, step: 0.1, default: 1 }
        ],
        pdf: (x, p) => {
            const exp = -0.5 * Math.pow((x - p.mu) / p.sigma, 2);
            return (1 / (p.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
        },
        cdf: (x, p) => {
            return 0.5 * (1 + erf((x - p.mu) / (p.sigma * Math.sqrt(2))));
        },
        range: { min: -15, max: 15 },
        fixedY: 1.0,
        what: "The bell curve. Symmetric distribution describing natural phenomena.",
        when: "Heights, IQ scores, measurement errors, test scores.",
        mechanics: "μ shifts the center. σ controls spread (width).",
        formula: "f(x) = (1/(σ√(2π))) × e^(-(x-μ)²/(2σ²))",
        mean: (p) => p.mu,
        variance: (p) => p.sigma * p.sigma
    },
    uniform: {
        id: 'uniform',
        name: 'UNIFORM (CONTINUOUS)',
        params: [
            { id: 'a', label: 'a (Min)', min: -10, max: 5, step: 0.5, default: -5 },
            { id: 'b', label: 'b (Max)', min: -4.5, max: 10, step: 0.5, default: 5 }
        ],
        pdf: (x, p) => {
            const a = Math.min(p.a, p.b - 0.1);
            const b = Math.max(p.b, p.a + 0.1);
            if (x >= a && x <= b) return 1 / (b - a);
            return 0;
        },
        cdf: (x, p) => {
            const a = Math.min(p.a, p.b - 0.1);
            const b = Math.max(p.b, p.a + 0.1);
            if (x < a) return 0;
            if (x > b) return 1;
            return (x - a) / (b - a);
        },
        range: { min: -15, max: 15 },
        fixedY: 1.2,
        what: "Equal probability for all values in [a,b]. The 'flat' distribution.",
        when: "Random number generation, unbiased selection.",
        mechanics: "Width (b-a) controls probability density. All values equally likely.",
        formula: "f(x) = 1/(b-a) for a ≤ x ≤ b, else 0",
        mean: (p) => (p.a + p.b) / 2,
        variance: (p) => Math.pow(p.b - p.a, 2) / 12
    },
    bernoulli: {
        id: 'bernoulli',
        name: 'BERNOULLI',
        params: [
            { id: 'p', label: 'p (Success Prob)', min: 0, max: 1, step: 0.01, default: 0.5 }
        ],
        pmf: (k, p) => {
            if (k === 1) return p.p;
            if (k === 0) return 1 - p.p;
            return 0;
        },
        cdf: (k, p) => {
            if (k < 0) return 0;
            if (k < 1) return 1 - p.p;
            return 1;
        },
        range: { min: -0.5, max: 1.5 },
        fixedY: 1.1,
        isDiscrete: true,
        what: "Single trial: success (1) or failure (0).",
        when: "Coin flip, single yes/no experiment, pass/fail test.",
        mechanics: "p = probability of success. (1-p) = probability of failure.",
        formula: "P(X=k) = p^k × (1-p)^(1-k), k ∈ {0,1}",
        mean: (p) => p.p,
        variance: (p) => p.p * (1 - p.p)
    },
    binomial: {
        id: 'binomial',
        name: 'BINOMIAL',
        params: [
            { id: 'n', label: 'n (Trials)', min: 1, max: 100, step: 1, default: 20 },
            { id: 'p', label: 'p (Success Prob)', min: 0, max: 1, step: 0.01, default: 0.5 }
        ],
        pmf: (k, p) => {
            if (k < 0 || k > p.n) return 0;
            return combinations(p.n, k) * Math.pow(p.p, k) * Math.pow(1 - p.p, p.n - k);
        },
        cdf: (k, p) => {
            if (k < 0) return 0;
            if (k >= p.n) return 1;
            let sum = 0;
            for (let i = 0; i <= Math.floor(k); i++) {
                sum += combinations(p.n, i) * Math.pow(p.p, i) * Math.pow(1 - p.p, p.n - i);
            }
            return sum;
        },
        range: { min: 0, max: 100 },
        autoScaleX: true,
        autoScaleY: true,
        isDiscrete: true,
        what: "Number of successes in n independent Bernoulli trials.",
        when: "Quality control (defects in n items), free throws in basketball.",
        mechanics: "n = number of trials. p = probability per trial. Shape becomes Normal as n increases.",
        formula: "P(X=k) = C(n,k) × p^k × (1-p)^(n-k)",
        mean: (p) => p.n * p.p,
        variance: (p) => p.n * p.p * (1 - p.p)
    },
    poisson: {
        id: 'poisson',
        name: 'POISSON',
        params: [
            { id: 'lambda', label: 'λ (Rate)', min: 0.1, max: 30, step: 0.1, default: 5 }
        ],
        pmf: (k, p) => {
            if (k < 0) return 0;
            return (Math.pow(p.lambda, k) * Math.exp(-p.lambda)) / factorial(k);
        },
        cdf: (k, p) => {
            if (k < 0) return 0;
            let sum = 0;
            for (let i = 0; i <= Math.floor(k); i++) {
                sum += (Math.pow(p.lambda, i) * Math.exp(-p.lambda)) / factorial(i);
            }
            return sum;
        },
        range: { min: 0, max: 50 },
        autoScaleX: true,
        autoScaleY: true,
        isDiscrete: true,
        what: "Count of events in a fixed time/space interval when events occur independently.",
        when: "Calls per hour, website visits per minute, defects per unit area.",
        mechanics: "λ = average rate. Distribution shifts right and looks more Normal as λ increases.",
        formula: "P(X=k) = (λ^k × e^(-λ)) / k!",
        mean: (p) => p.lambda,
        variance: (p) => p.lambda
    },
    exponential: {
        id: 'exponential',
        name: 'EXPONENTIAL',
        params: [
            { id: 'lambda', label: 'λ (Rate)', min: 0.1, max: 5, step: 0.1, default: 1 }
        ],
        pdf: (x, p) => {
            if (x < 0) return 0;
            return p.lambda * Math.exp(-p.lambda * x);
        },
        cdf: (x, p) => {
            if (x < 0) return 0;
            return 1 - Math.exp(-p.lambda * x);
        },
        range: { min: 0, max: 10 },
        fixedY: 5.5,
        what: "Time between events in a Poisson process. 'Memoryless' distribution.",
        when: "Time until next customer, component failure time, radioactive decay.",
        mechanics: "λ = event rate. Higher λ means shorter wait times (steeper decay).",
        formula: "f(x) = λ × e^(-λx) for x ≥ 0",
        mean: (p) => 1 / p.lambda,
        variance: (p) => 1 / (p.lambda * p.lambda)
    }
};
