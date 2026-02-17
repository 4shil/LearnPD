/**
 * Mathematical utilities, log-gamma, incomplete gamma, regularized beta,
 * and 14 probability distributions with stats, definitions, and random samplers.
 */

// --- HIGH-PRECISION MATH UTILS ---

export const factorial = (n) => {
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
};

export const combinations = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
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

// --- BASE RANDOM SAMPLERS ---


// --- DISTRIBUTIONS DEFINITIONS ---

export const DISTRIBUTIONS = {
    normal: {
        id: 'normal',
        name: 'NORMAL (GAUSSIAN)',
        isDiscrete: false,
        params: [
            { id: 'mu', label: 'μ (Mean)', min: -10, max: 10, step: 0.1, default: 0 },
            { id: 'sigma', label: 'σ (Std Dev)', min: 0.1, max: 5, step: 0.1, default: 1 }
        ],
        pdf: (x, p) => {
            const exp = -0.5 * Math.pow((x - p.mu) / p.sigma, 2);
            return (1 / (p.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
        },
        cdf: (x, p) => 0.5 * (1 + erf((x - p.mu) / (p.sigma * Math.sqrt(2)))),
        mean: (p) => p.mu,
        variance: (p) => p.sigma * p.sigma,
        range: { min: -15, max: 15 },
        fixedY: 1.0,
        what: "The symmetric bell curve. Describes natural variations around a central mean.",
        when: "Heights, test scores, error measurements, physical attributes.",
        mechanics: "μ shifts center. σ stretches or squeezes the width.",
        formula: "f(x) = (1 / (σ √(2π))) e^{-0.5 ((x-μ)/σ)^2}"
    },
    uniform: {
        id: 'uniform',
        name: 'UNIFORM (CONTINUOUS)',
        isDiscrete: false,
        params: [
            { id: 'a', label: 'a (Min)', min: -10, max: 5, step: 0.5, default: -5 },
            { id: 'b', label: 'b (Max)', min: -4.5, max: 10, step: 0.5, default: 5 }
        ],
        pdf: (x, p) => {
            const a = Math.min(p.a, p.b - 0.1);
            const b = Math.max(p.b, p.a + 0.1);
            return (x >= a && x <= b) ? 1 / (b - a) : 0;
        },
        cdf: (x, p) => {
            const a = Math.min(p.a, p.b - 0.1);
            const b = Math.max(p.b, p.a + 0.1);
            if (x < a) return 0;
            if (x > b) return 1;
            return (x - a) / (b - a);
        },
        mean: (p) => (p.a + p.b) / 2,
        variance: (p) => Math.pow(p.b - p.a, 2) / 12,
        range: { min: -15, max: 15 },
        fixedY: 1.2,
        what: "Constant probability density across an interval [a, b]. All equal intervals are equally likely.",
        when: "Random number generation, clock spin angles, wait times.",
        mechanics: "Spans a flat line from a to b. Height is inversely proportional to span width.",
        formula: "f(x) = 1 / (b - a) for a ≤ x ≤ b"
    },
    bernoulli: {
        id: 'bernoulli',
        name: 'BERNOULLI',
        isDiscrete: true,
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
        mean: (p) => p.p,
        variance: (p) => p.p * (1 - p.p),
        range: { min: -0.5, max: 1.5 },
        fixedY: 1.1,
        what: "Single trial with binary outcomes: success (1) with probability p, or failure (0).",
        when: "Single coin flip, yes/no votes, pass/fail results, binary classifications.",
        mechanics: "Simple bar charts at 0 and 1. Sum of heights is always 1.",
        formula: "P(X=k) = p^k (1-p)^{1-k}, k ∈ {0,1}"
    },
    binomial: {
        id: 'binomial',
        name: 'BINOMIAL',
        isDiscrete: true,
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
        mean: (p) => p.n * p.p,
        variance: (p) => p.n * p.p * (1 - p.p),
        range: { min: 0, max: 100 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Total number of successes in n independent Bernoulli trials with probability p.",
        when: "Defective units in a batch, basketball free-throw counts, network packets delivered.",
        mechanics: "Becomes bell-shaped (Normal) as n increases, showing the Central Limit Theorem.",
        formula: "P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}"
    },
    poisson: {
        id: 'poisson',
        name: 'POISSON',
        isDiscrete: true,
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
        mean: (p) => p.lambda,
        variance: (p) => p.lambda,
        range: { min: 0, max: 50 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Counts the number of independent events occurring in a fixed interval of time or space.",
        when: "Website visits per minute, calls to a center per hour, decay particles counted.",
        mechanics: "Left-skewed for small λ; shifts right and symmetrizes as rate increases.",
        formula: "P(X=k) = (λ^k e^{-λ}) / k!"
    },
    exponential: {
        id: 'exponential',
        name: 'EXPONENTIAL',
        isDiscrete: false,
        params: [
            { id: 'lambda', label: 'λ (Rate)', min: 0.1, max: 5, step: 0.1, default: 1 }
        ],
        pdf: (x, p) => (x < 0) ? 0 : p.lambda * Math.exp(-p.lambda * x),
        cdf: (x, p) => (x < 0) ? 0 : 1 - Math.exp(-p.lambda * x),
        mean: (p) => 1 / p.lambda,
        variance: (p) => 1 / (p.lambda * p.lambda),
        range: { min: 0, max: 10 },
        fixedY: 5.5,
        what: "Models waiting times between independent Poisson events. Famously 'memoryless'.",
        when: "Customer service durations, lifetime of electronics, radioactive decay half-lives.",
        mechanics: "Steep exponential decay starting at x=0. Rate λ dictates decay speed.",
        formula: "f(x) = λ e^{-λ x} for x ≥ 0"
    },
};