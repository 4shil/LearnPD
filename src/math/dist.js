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
        return Math.round(Math.exp(logCombination(n, k)));
    }
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - i + 1) / i;
    }
    return res;
};

export const logGamma = (x) => {
    if (x <= 0) return -Infinity;
    // Lanczos approximation (g=7, n=9)
    const p = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765307,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];
    let sum = p[0];
    for (let i = 1; i < 9; i++) {
        sum += p[i] / (x + i - 1);
    }
    const t = x + 6.5;
    return Math.log(Math.sqrt(2 * Math.PI)) + Math.log(sum) - t + (x - 0.5) * Math.log(t);
};

export const logCombination = (n, k) => {
    if (k < 0 || k > n) return -Infinity;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
};

export const regularizedGammaP = (s, x) => {
    if (x <= 0) return 0;
    if (s <= 0) return 1;
    const err = 1e-15;
    const maxIt = 200;
    const logG = logGamma(s);
    
    if (x < s + 1) {
        let sum = 1 / s;
        let term = 1 / s;
        for (let n = 1; n < maxIt; n++) {
            term = (term * x) / (s + n);
            sum += term;
            if (term < err * sum) break;
        }
        return Math.exp(s * Math.log(x) - x - logG) * sum;
    }
    
    let b = x + 1 - s;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < maxIt; i++) {
        const a = i * (s - i);
        b += 2;
        d = b + a * d;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + a / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        const delta = c * d;
        h *= delta;
        if (Math.abs(delta - 1) < err) break;
    }
    return 1 - Math.exp(s * Math.log(x) - x - logG) * h;
};

const betaCf = (a, b, x) => {
    const maxIt = 200;
    const eps = 1e-15;
    const tiny = 1e-30;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    let h = d;
    
    for (let m = 1; m <= maxIt; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < tiny) d = tiny;
        d = 1 / d;
        c = 1 + aa / c;
        if (Math.abs(c) < tiny) c = tiny;
        h *= c * d;
        
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < tiny) d = tiny;
        d = 1 / d;
        c = 1 + aa / c;
        if (Math.abs(c) < tiny) c = tiny;
        const delta = c * d;
        h *= delta;
        if (Math.abs(delta - 1) < eps) break;
    }
    return h;
};

export const regularizedBeta = (a, b, x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    if (x < (a + 1) / (a + b + 2)) {
        const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
        return front * betaCf(a, b, x);
    } else {
        const front = Math.exp(b * Math.log(1 - x) + a * Math.log(x) - lbeta) / b;
        return 1 - front * betaCf(b, a, 1 - x);
    }
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
export const sampleNormal = (mu, sigma) => {
    const u1 = Math.max(1e-15, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + sigma * z;
};

export const sampleGamma = (k, theta) => {
    if (k < 1) {
        return sampleGamma(k + 1, theta) * Math.pow(Math.random(), 1 / k);
    }
    const d = k - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x, v, u;
        do {
            x = sampleNormal(0, 1);
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        u = Math.random();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
    }
};

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
            const sigma = Math.max(1e-9, p.sigma);
            const exp = -0.5 * Math.pow((x - p.mu) / sigma, 2);
            return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
        },
        cdf: (x, p) => {
            const sigma = Math.max(1e-9, p.sigma);
            return 0.5 * (1 + erf((x - p.mu) / (sigma * Math.sqrt(2))));
        },
        mean: (p) => p.mu,
        variance: (p) => p.sigma * p.sigma,
        median: (p) => p.mu,
        skewness: (p) => 0,
        kurtosis: (p) => 0,
        sample: (p) => sampleNormal(p.mu, Math.max(1e-9, p.sigma)),
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
        median: (p) => (p.a + p.b) / 2,
        skewness: (p) => 0,
        kurtosis: (p) => -1.2,
        sample: (p) => {
            const a = Math.min(p.a, p.b - 0.1);
            const b = Math.max(p.b, p.a + 0.1);
            return a + (b - a) * Math.random();
        },
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
            const rK = Math.round(k);
            const prob = Math.max(0, Math.min(1, p.p));
            if (rK === 1) return prob;
            if (rK === 0) return 1 - prob;
            return 0;
        },
        cdf: (k, p) => {
            const rK = Math.floor(k);
            const prob = Math.max(0, Math.min(1, p.p));
            if (rK < 0) return 0;
            if (rK < 1) return 1 - prob;
            return 1;
        },
        mean: (p) => Math.max(0, Math.min(1, p.p)),
        variance: (p) => {
            const prob = Math.max(0, Math.min(1, p.p));
            return prob * (1 - prob);
        },
        median: (p) => (p.p > 0.5 ? 1 : p.p < 0.5 ? 0 : 0.5),
        skewness: (p) => {
            const prob = Math.max(0, Math.min(1, p.p));
            return (1 - 2 * prob) / Math.sqrt(prob * (1 - prob) || 1e-6);
        },
        kurtosis: (p) => {
            const prob = Math.max(0, Math.min(1, p.p));
            return (1 - 6 * prob * (1 - prob)) / (prob * (1 - prob) || 1e-6);
        },
        sample: (p) => (Math.random() < p.p ? 1 : 0),
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
            const n = Math.round(p.n);
            const rK = Math.round(k);
            if (rK < 0 || rK > n) return 0;
            const prob = Math.max(0, Math.min(1, p.p));
            if (prob === 0) return rK === 0 ? 1 : 0;
            if (prob === 1) return rK === n ? 1 : 0;
            return Math.exp(logCombination(n, rK) + rK * Math.log(prob) + (n - rK) * Math.log(1 - prob));
        },
        cdf: (k, p) => {
            const n = Math.round(p.n);
            const rK = Math.floor(k);
            if (rK < 0) return 0;
            if (rK >= n) return 1;
            const prob = Math.max(0, Math.min(1, p.p));
            let sum = 0;
            for (let i = 0; i <= rK; i++) {
                if (prob === 0) sum += (i === 0 ? 1 : 0);
                else if (prob === 1) sum += (i === n ? 1 : 0);
                else sum += Math.exp(logCombination(n, i) + i * Math.log(prob) + (n - i) * Math.log(1 - prob));
            }
            return Math.min(1.0, sum);
        },
        mean: (p) => Math.round(p.n) * p.p,
        variance: (p) => Math.round(p.n) * p.p * (1 - p.p),
        median: (p) => Math.round(Math.round(p.n) * p.p),
        skewness: (p) => (1 - 2 * p.p) / Math.sqrt(Math.round(p.n) * p.p * (1 - p.p) || 1e-6),
        kurtosis: (p) => (1 - 6 * p.p * (1 - p.p)) / (Math.round(p.n) * p.p * (1 - p.p) || 1e-6),
        sample: (p) => {
            const n = Math.round(p.n);
            let s = 0;
            for (let i = 0; i < n; i++) if (Math.random() < p.p) s++;
            return s;
        },
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
            const rK = Math.round(k);
            const lmb = Math.max(1e-9, p.lambda);
            return Math.exp(rK * Math.log(lmb) - lmb - logGamma(rK + 1));
        },
        cdf: (k, p) => {
            if (k < 0) return 0;
            const rK = Math.floor(k);
            const lmb = Math.max(1e-9, p.lambda);
            let sum = 0;
            for (let i = 0; i <= rK; i++) {
                sum += Math.exp(i * Math.log(lmb) - lmb - logGamma(i + 1));
            }
            return Math.min(1.0, sum);
        },
        mean: (p) => p.lambda,
        variance: (p) => p.lambda,
        median: (p) => Math.floor(p.lambda + 1/3 - 0.02 / p.lambda),
        skewness: (p) => 1 / Math.sqrt(p.lambda),
        kurtosis: (p) => 1 / p.lambda,
        sample: (p) => {
            const lmb = Math.max(1e-9, p.lambda);
            const L = Math.exp(-lmb);
            let k = 0, pr = 1;
            do {
                k++;
                pr *= Math.random();
            } while (pr > L && k < 1000);
            return k - 1;
        },
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
        pdf: (x, p) => {
            const lmb = Math.max(1e-9, p.lambda);
            return (x < 0) ? 0 : lmb * Math.exp(-lmb * x);
        },
        cdf: (x, p) => {
            const lmb = Math.max(1e-9, p.lambda);
            return (x < 0) ? 0 : 1 - Math.exp(-lmb * x);
        },
        mean: (p) => 1 / Math.max(1e-9, p.lambda),
        variance: (p) => 1 / (Math.max(1e-9, p.lambda) * Math.max(1e-9, p.lambda)),
        median: (p) => Math.log(2) / Math.max(1e-9, p.lambda),
        skewness: (p) => 2,
        kurtosis: (p) => 6,
        sample: (p) => -Math.log(1 - Math.max(1e-15, Math.random())) / Math.max(1e-9, p.lambda),
        range: { min: 0, max: 10 },
        fixedY: 5.5,
        what: "Models waiting times between independent Poisson events. Famously 'memoryless'.",
        when: "Customer service durations, lifetime of electronics, radioactive decay half-lives.",
        mechanics: "Steep exponential decay starting at x=0. Rate λ dictates decay speed.",
        formula: "f(x) = λ e^{-λ x} for x ≥ 0"
    },
    geometric: {
        id: 'geometric',
        name: 'GEOMETRIC',
        isDiscrete: true,
        params: [
            { id: 'p', label: 'p (Success Prob)', min: 0.05, max: 1.0, step: 0.05, default: 0.3 }
        ],
        pmf: (k, p) => {
            if (k < 0) return 0;
            const rK = Math.round(k);
            const prob = Math.max(0.0001, Math.min(1, p.p));
            return Math.pow(1 - prob, rK) * prob;
        },
        cdf: (k, p) => {
            if (k < 0) return 0;
            const rK = Math.floor(k);
            const prob = Math.max(0.0001, Math.min(1, p.p));
            return 1 - Math.pow(1 - prob, rK + 1);
        },
        mean: (p) => (1 - p.p) / Math.max(1e-9, p.p),
        variance: (p) => (1 - p.p) / Math.pow(Math.max(1e-9, p.p), 2),
        median: (p) => {
            const prob = Math.max(0.0001, Math.min(1, p.p));
            if (prob === 1) return 0;
            return Math.max(0, Math.ceil(Math.log(0.5) / Math.log(1 - prob)) - 1);
        },
        skewness: (p) => {
            const prob = Math.max(0.0001, Math.min(1, p.p));
            return (2 - prob) / Math.sqrt(1 - prob);
        },
        kurtosis: (p) => {
            const prob = Math.max(0.0001, Math.min(1, p.p));
            if (prob === 1) return 0;
            return 6 + (prob * prob) / (1 - prob);
        },
        sample: (p) => {
            const prob = Math.max(0.0001, Math.min(1, p.p));
            if (prob === 1) return 0;
            return Math.floor(Math.log(1 - Math.random()) / Math.log(1 - prob));
        },
        range: { min: 0, max: 40 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Models number of failures before the first success in independent trials.",
        when: "Number of job applications rejected before offer, flips before heads.",
        mechanics: "Discrete decay. Value at k=0 is always p (success on first try).",
        formula: "P(X=k) = (1-p)^k p, k ∈ {0,1,2,...}"
    },
    hypergeometric: {
        id: 'hypergeometric',
        name: 'HYPERGEOMETRIC',
        isDiscrete: true,
        params: [
            { id: 'N', label: 'N (Pop Size)', min: 10, max: 100, step: 1, default: 50 },
            { id: 'K', label: 'K (Successes in Pop)', min: 1, max: 90, step: 1, default: 20 },
            { id: 'n', label: 'n (Sample Size)', min: 1, max: 90, step: 1, default: 15 }
        ],
        pmf: (k, p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            const rK = Math.round(k);
            if (rK < Math.max(0, n + K - N) || rK > Math.min(n, K)) return 0;
            return Math.exp(logCombination(K, rK) + logCombination(N - K, n - rK) - logCombination(N, n));
        },
        cdf: (k, p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            const rK = Math.floor(k);
            if (rK < 0) return 0;
            if (rK >= Math.min(n, K)) return 1;
            let sum = 0;
            for (let i = 0; i <= rK; i++) {
                sum += Math.exp(logCombination(K, i) + logCombination(N - K, n - i) - logCombination(N, n));
            }
            return Math.min(1.0, sum);
        },
        mean: (p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            return N === 0 ? 0 : n * K / N;
        },
        variance: (p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            if (N <= 1) return 0;
            return n * (K / N) * (1 - K / N) * (N - n) / (N - 1);
        },
        median: (p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            return N === 0 ? 0 : Math.round(n * (K / N));
        },
        skewness: (p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            if (N <= 2 || n === 0 || K === 0) return 0;
            const den = (N - 2) * Math.sqrt(n * K * (N - K) * (N - n) * (N - 1));
            return den === 0 ? 0 : (N - 2 * K) * (N - 2 * n) * Math.sqrt(N - 1) / den;
        },
        kurtosis: (p) => {
            const N = Math.round(p.N);
            if (N <= 3) return 0;
            return 0.1;
        },
        sample: (p) => {
            const N = Math.round(p.N);
            const K = Math.min(Math.round(p.K), N);
            const n = Math.min(Math.round(p.n), N);
            let successes = 0, pop = N, succ = K;
            for (let i = 0; i < n; i++) {
                if (pop <= 0) break;
                if (Math.random() < succ / pop) { successes++; succ--; }
                pop--;
            }
            return successes;
        },
        range: { min: 0, max: 100 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Probability of k successes in n draws *without* replacement from population N.",
        when: "Dealing cards without reshuffle, quality sampling without replacement.",
        mechanics: "Bound by min successes max limit constraints. Resembles Binomial when N is large.",
        formula: "P(X=k) = \\binom{K}{k} \\binom{N-K}{n-k} / \\binom{N}{n}"
    },
    gamma: {
        id: 'gamma',
        name: 'GAMMA',
        isDiscrete: false,
        params: [
            { id: 'shape', label: 'k (Shape)', min: 0.5, max: 15, step: 0.1, default: 2 },
            { id: 'scale', label: 'θ (Scale)', min: 0.2, max: 5, step: 0.1, default: 2 }
        ],
        pdf: (x, p) => {
            if (x <= 0) return 0;
            const k = Math.max(1e-9, p.shape);
            const th = Math.max(1e-9, p.scale);
            return Math.exp((k - 1) * Math.log(x) - x / th - k * Math.log(th) - logGamma(k));
        },
        cdf: (x, p) => {
            const k = Math.max(1e-9, p.shape);
            const th = Math.max(1e-9, p.scale);
            return (x <= 0) ? 0 : regularizedGammaP(k, x / th);
        },
        mean: (p) => p.shape * p.scale,
        variance: (p) => p.shape * p.scale * p.scale,
        median: (p) => {
            const k = Math.max(1e-9, p.shape);
            return k * p.scale * (1 - 1 / (9 * k));
        },
        skewness: (p) => 2 / Math.sqrt(Math.max(1e-9, p.shape)),
        kurtosis: (p) => 6 / Math.max(1e-9, p.shape),
        sample: (p) => sampleGamma(Math.max(1e-9, p.shape), Math.max(1e-9, p.scale)),
        range: { min: 0, max: 40 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Continuous distribution modeling waiting times until k independent events occur.",
        when: "Aggregated rain volumes, service duration, aggregate insurance claims.",
        mechanics: "Extremely flexible. Exponential when k=1; bell-shaped for large k.",
        formula: "f(x) = x^{k-1} e^{-x/θ} / (θ^k Γ(k)) for x > 0"
    },
    beta: {
        id: 'beta',
        name: 'BETA',
        isDiscrete: false,
        params: [
            { id: 'alpha', label: 'α (Alpha)', min: 0.5, max: 15, step: 0.1, default: 2 },
            { id: 'beta', label: 'β (Beta)', min: 0.5, max: 15, step: 0.1, default: 2 }
        ],
        pdf: (x, p) => {
            if (x < 0 || x > 1) return 0;
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            // Guard infinity at boundaries
            if (x === 0 && a < 1) return Infinity;
            if (x === 1 && b < 1) return Infinity;
            const lB = logGamma(a) + logGamma(b) - logGamma(a + b);
            return Math.exp((a - 1) * Math.log(x || 1e-30) + (b - 1) * Math.log((1 - x) || 1e-30) - lB);
        },
        cdf: (x, p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return (x <= 0) ? 0 : (x >= 1) ? 1 : regularizedBeta(a, b, x);
        },
        mean: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return a / (a + b);
        },
        variance: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return (a * b) / (Math.pow(a + b, 2) * (a + b + 1));
        },
        median: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return (a - 1/3) / (a + b - 2/3);
        },
        skewness: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return 2 * (b - a) * Math.sqrt(a + b + 1) / ((a + b + 2) * Math.sqrt(a * b));
        },
        kurtosis: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            return 6 * (Math.pow(a - b, 2) * (a + b + 1) - a * b * (a + b + 2)) / (a * b * (a + b + 2) * (a + b + 3));
        },
        sample: (p) => {
            const a = Math.max(1e-9, p.alpha);
            const b = Math.max(1e-9, p.beta);
            const x = sampleGamma(a, 1);
            const y = sampleGamma(b, 1);
            return x / (x + y || 1e-6);
        },
        range: { min: 0, max: 1 },
        fixedY: 3.5,
        what: "Family of continuous distributions defined on [0,1], widely used to model random percentages.",
        when: "Customer conversion rates, project completion probabilities, Bayesian priors.",
        mechanics: "Creates U-shapes, flat lines, bell shapes depending on shape parameters α, β.",
        formula: "f(x) = x^{α-1} (1-x)^{β-1} / B(α, β) for 0 ≤ x ≤ 1"
    },
    chisquare: {
        id: 'chisquare',
        name: 'CHI-SQUARE',
        isDiscrete: false,
        params: [
            { id: 'df', label: 'df (Deg Freedom)', min: 1, max: 30, step: 1, default: 4 }
        ],
        pdf: (x, p) => {
            if (x <= 0) return 0;
            const k = Math.max(1e-9, p.df);
            return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - logGamma(k / 2));
        },
        cdf: (x, p) => {
            const k = Math.max(1e-9, p.df);
            return (x <= 0) ? 0 : regularizedGammaP(k / 2, x / 2);
        },
        mean: (p) => Math.max(0, p.df),
        variance: (p) => 2 * Math.max(0, p.df),
        median: (p) => {
            const k = Math.max(1e-9, p.df);
            return k * Math.pow(1 - 2 / (9 * k), 3);
        },
        skewness: (p) => Math.sqrt(8 / Math.max(1e-9, p.df)),
        kurtosis: (p) => 12 / Math.max(1e-9, p.df),
        sample: (p) => sampleGamma(Math.max(1e-9, p.df) / 2, 2),
        range: { min: 0, max: 40 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Distribution of sum of squares of df independent standard normal random variables.",
        when: "Hypothesis testing (Pearson chi-square test), goodness-of-fit evaluations.",
        mechanics: "Extremely right-skewed for df=1, df=2; moves to Gaussian as degrees increase.",
        formula: "f(x) = x^{(df/2)-1} e^{-x/2} / (2^{df/2} Γ(df/2)) for x > 0"
    },
    lognormal: {
        id: 'lognormal',
        name: 'LOG-NORMAL',
        isDiscrete: false,
        params: [
            { id: 'mu', label: 'μ (Location)', min: -2, max: 3, step: 0.1, default: 0 },
            { id: 'sigma', label: 'σ (Scale)', min: 0.1, max: 2, step: 0.1, default: 0.5 }
        ],
        pdf: (x, p) => {
            if (x <= 0) return 0;
            const sigma = Math.max(1e-9, p.sigma);
            const exp = -Math.pow(Math.log(x) - p.mu, 2) / (2 * sigma * sigma);
            return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
        },
        cdf: (x, p) => {
            const sigma = Math.max(1e-9, p.sigma);
            return (x <= 0) ? 0 : 0.5 * (1 + erf((Math.log(x) - p.mu) / (sigma * Math.sqrt(2))));
        },
        mean: (p) => Math.exp(p.mu + p.sigma * p.sigma / 2),
        variance: (p) => (Math.exp(p.sigma * p.sigma) - 1) * Math.exp(2 * p.mu + p.sigma * p.sigma),
        median: (p) => Math.exp(p.mu),
        skewness: (p) => (Math.exp(p.sigma * p.sigma) + 2) * Math.sqrt(Math.exp(p.sigma * p.sigma) - 1),
        kurtosis: (p) => Math.exp(4 * p.sigma * p.sigma) + 2 * Math.exp(3 * p.sigma * p.sigma) + 3 * Math.exp(2 * p.sigma * p.sigma) - 6,
        sample: (p) => Math.exp(sampleNormal(p.mu, Math.max(1e-9, p.sigma))),
        range: { min: 0, max: 25 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Continuous distribution of a random variable whose logarithm is normally distributed.",
        when: "Income sizes, geological sizes, stock prices, city populations.",
        mechanics: "Always positive, highly right-skewed. Fits right-tail heavy datasets.",
        formula: "f(x) = (1 / (x σ √(2π))) e^{-0.5 ((\\ln x - μ)/σ)^2} for x > 0"
    },
    studentt: {
        id: 'studentt',
        name: 'STUDENT\'S T',
        isDiscrete: false,
        params: [
            { id: 'df', label: 'df (Deg Freedom)', min: 1, max: 30, step: 1, default: 4 }
        ],
        pdf: (x, p) => {
            const v = Math.max(1e-9, p.df);
            const coef = logGamma((v + 1) / 2) - logGamma(v / 2) - 0.5 * Math.log(v * Math.PI);
            return Math.exp(coef - ((v + 1) / 2) * Math.log(1 + x * x / v));
        },
        cdf: (x, p) => {
            const v = Math.max(1e-9, p.df);
            const xt = v / (v + x * x);
            const ibeta = regularizedBeta(v / 2, 0.5, xt);
            return x < 0 ? 0.5 * ibeta : 1 - 0.5 * ibeta;
        },
        mean: (p) => p.df > 1 ? 0 : NaN,
        variance: (p) => p.df > 2 ? p.df / (p.df - 2) : p.df > 1 ? Infinity : NaN,
        median: (p) => 0,
        skewness: (p) => p.df > 3 ? 0 : NaN,
        kurtosis: (p) => p.df > 4 ? 6 / (p.df - 4) : p.df > 2 ? Infinity : NaN,
        sample: (p) => {
            const v = Math.max(1e-9, p.df);
            const z = sampleNormal(0, 1);
            const g = sampleGamma(v / 2, 2);
            return z / Math.sqrt(g / v);
        },
        range: { min: -10, max: 10 },
        fixedY: 0.5,
        what: "Symmetric bell curve with heavier tails than the Normal distribution.",
        when: "Small sample size hypothesis testing (T-tests), stock market return modeling.",
        mechanics: "Has fat tails to account for small sample uncertainty; becomes Normal as df → ∞.",
        formula: "f(x) = Γ((df+1)/2) (1 + x^2/df)^{-(df+1)/2} / (\\sqrt{df\\pi} Γ(df/2))"
    },
    weibull: {
        id: 'weibull',
        name: 'WEIBULL',
        isDiscrete: false,
        params: [
            { id: 'scale', label: 'λ (Scale)', min: 0.2, max: 10, step: 0.1, default: 1.5 },
            { id: 'shape', label: 'k (Shape)', min: 0.5, max: 10, step: 0.1, default: 2.0 }
        ],
        pdf: (x, p) => {
            if (x < 0) return 0;
            if (p.scale <= 0) return NaN;
            const k = Math.max(1e-9, p.shape);
            const lam = Math.max(1e-9, p.scale);
            if (x === 0 && k < 1) return Infinity;
            return (k / lam) * Math.pow(x / lam, k - 1) * Math.exp(-Math.pow(x / lam, k));
        },
        cdf: (x, p) => {
            if (p.scale <= 0) return NaN;
            const k = Math.max(1e-9, p.shape);
            const lam = Math.max(1e-9, p.scale);
            return (x < 0) ? 0 : 1 - Math.exp(-Math.pow(x / lam, k));
        },
        mean: (p) => {
            const k = Math.max(1e-9, p.shape);
            return p.scale * Math.exp(logGamma(1 + 1 / k));
        },
        variance: (p) => {
            const k = Math.max(1e-9, p.shape);
            const m1 = Math.exp(logGamma(1 + 1 / k));
            const m2 = Math.exp(logGamma(1 + 2 / k));
            return p.scale * p.scale * (m2 - m1 * m1);
        },
        median: (p) => {
            const k = Math.max(1e-9, p.shape);
            return p.scale * Math.pow(Math.log(2), 1 / k);
        },
        skewness: (p) => {
            const k = Math.max(1e-9, p.shape);
            const g1 = Math.exp(logGamma(1 + 1/k));
            const g2 = Math.exp(logGamma(1 + 2/k));
            const g3 = Math.exp(logGamma(1 + 3/k));
            const sig = Math.sqrt(g2 - g1*g1);
            return sig === 0 ? 0 : (g3 - 3*g1*g2 + 2*g1*g1*g1) / (sig*sig*sig);
        },
        kurtosis: (p) => {
            const k = Math.max(1e-9, p.shape);
            const g1 = Math.exp(logGamma(1 + 1/k));
            const g2 = Math.exp(logGamma(1 + 2/k));
            const g3 = Math.exp(logGamma(1 + 3/k));
            const g4 = Math.exp(logGamma(1 + 4/k));
            const var_val = g2 - g1*g1;
            return var_val === 0 ? 0 : (g4 - 4*g1*g3 + 6*g1*g1*g2 - 3*g1*g1*g1*g1) / (var_val*var_val) - 3;
        },
        sample: (p) => {
            const k = Math.max(1e-9, p.shape);
            const lam = Math.max(1e-9, p.scale);
            return lam * Math.pow(-Math.log(1 - Math.max(1e-15, Math.random())), 1 / k);
        },
        range: { min: 0, max: 20 },
        autoScaleX: true,
        autoScaleY: true,
        what: "Highly versatile distribution modeling failure rates and material lifetime tests.",
        when: "Predicting time-to-failure in mechanical designs, wind speeds, insurance analysis.",
        mechanics: "Shape k determines behavior: k < 1 (decreasing hazard), k=1 (exponential), k > 1 (increasing).",
        formula: "f(x) = (k/λ) (x/λ)^{k-1} e^{-(x/λ)^k} for x ≥ 0"
    }
};
