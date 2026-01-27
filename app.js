// CONFIG
const ACCENT = '#FFFF00';
const BG = '#FFFFFF';
const FG = '#000000';

// APP STATE
let currentDist = 'normal';
let params = {};
let mathVisible = false;

// DOM ELEMENTS
const mainCanvas = document.getElementById('mainCanvas');
const teaserCanvas = document.getElementById('teaserCanvas');
const mainCtx = mainCanvas?.getContext('2d');
const teaserCtx = teaserCanvas?.getContext('2d');

// NAVIGATION
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${viewId}`);
    });

    if (viewId === 'explorer') {
        resizeCanvas();
        initDistribution();
    }
}

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1) || 'home';
    switchView(hash);
});

// MATH UTILS
const factorial = (n) => {
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Prevent overflow
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
};

const combinations = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    
    // Use logarithms for large values to prevent overflow
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

// ERROR FUNCTION (for Normal CDF)
const erf = (x) => {
    // Abramowitz and Stegun approximation
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
const DISTRIBUTIONS = {
    normal: {
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

// INITIALIZATION
function initDistribution() {
    const select = document.getElementById('distSelect');
    currentDist = select.value;
    const dist = DISTRIBUTIONS[currentDist];
    
    // Reset params
    params = {};
    const sliderContainer = document.getElementById('paramSliders');
    sliderContainer.innerHTML = '';
    
    dist.params.forEach(p => {
        params[p.id] = p.default;
        
        const div = document.createElement('div');
        div.className = 'param-control';
        div.innerHTML = `
            <label><span>${p.label}</span> <span id="val-${p.id}">${p.default}</span></label>
            <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}" 
                oninput="updateParam('${p.id}', this.value)">
        `;
        sliderContainer.appendChild(div);
    });

    // Update Text
    document.getElementById('whatText').innerText = dist.what;
    document.getElementById('whenText').innerText = dist.when;
    document.getElementById('mechanicsText').innerText = dist.mechanics;
    document.getElementById('formulaBox').innerText = dist.formula;

    render();
}

function updateParam(id, val) {
    params[id] = parseFloat(val);
    document.getElementById(`val-${id}`).innerText = val;
    render();
}

function toggleMath() {
    mathVisible = !mathVisible;
    const box = document.getElementById('formulaBox');
    const btn = document.querySelector('.math-toggle');
    
    if (mathVisible) {
        box.classList.remove('hidden');
        btn.innerText = 'HIDE MATH';
        box.classList.add('shake');
        setTimeout(() => box.classList.remove('shake'), 300);
    } else {
        box.classList.add('hidden');
        btn.innerText = 'SHOW MATH';
    }
}

// RENDERING
function render() {
    if (!mainCtx) return;
    const dist = DISTRIBUTIONS[currentDist];
    const width = mainCanvas.width;
    const height = mainCanvas.height;
    const padding = 60;

    mainCtx.clearRect(0, 0, width, height);

    // Draw Grid
    mainCtx.strokeStyle = '#eee';
    mainCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        let x = padding + (i * (width - 2 * padding) / 10);
        mainCtx.beginPath();
        mainCtx.moveTo(x, padding);
        mainCtx.lineTo(x, height - padding);
        mainCtx.stroke();
    }

    // Draw Axes
    mainCtx.strokeStyle = FG;
    mainCtx.lineWidth = 4;
    mainCtx.beginPath();
    mainCtx.moveTo(padding, padding);
    mainCtx.lineTo(padding, height - padding);
    mainCtx.lineTo(width - padding, height - padding);
    mainCtx.stroke();

    let xMin = dist.range.min;
    let xMax = dist.range.max;
    
    // Auto-scale X for discrete distributions
    if (dist.autoScaleX && dist.isDiscrete) {
        const mean = dist.mean(params);
        const variance = dist.variance(params);
        const std = Math.sqrt(variance);
        xMin = Math.max(dist.range.min, Math.floor(mean - 4 * std));
        xMax = Math.min(dist.range.max, Math.ceil(mean + 4 * std));
    }

    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Calculate points
    let points = [];
    let maxY = 0.001;

    if (dist.isDiscrete) {
        for (let k = Math.floor(xMin); k <= Math.ceil(xMax); k++) {
            const y = dist.pmf(k, params);
            if (y > maxY) maxY = y;
            points.push({ x: k, y: y });
        }
    } else {
        const steps = 300;
        for (let i = 0; i <= steps; i++) {
            const x = xMin + (i / steps) * (xMax - xMin);
            const y = dist.pdf(x, params);
            if (y > maxY && isFinite(y)) maxY = y;
            points.push({ x: x, y: y });
        }
    }

    // Logic for Y scaling
    if (dist.fixedY) {
        maxY = dist.fixedY;
    } else if (dist.autoScaleY) {
        maxY *= 1.2;
    } else {
        maxY = 1.0;
    }

    // Plot
    mainCtx.lineWidth = 6;
    if (dist.isDiscrete) {
        // Bar chart for discrete
        const numBars = xMax - xMin + 1;
        const barWidth = Math.min((plotWidth / numBars) * 0.8, 40);
        
        points.forEach(p => {
            const canvasX = padding + ((p.x - xMin) / (xMax - xMin)) * plotWidth;
            const canvasY = height - padding - (p.y / maxY) * plotHeight;
            
            mainCtx.fillStyle = ACCENT;
            mainCtx.fillRect(canvasX - barWidth/2, canvasY, barWidth, (height - padding) - canvasY);
            mainCtx.strokeStyle = FG;
            mainCtx.strokeRect(canvasX - barWidth/2, canvasY, barWidth, (height - padding) - canvasY);
        });
        
        // Calculate statistics
        const mean = dist.mean(params);
        const variance = dist.variance(params);
        const peak = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        document.getElementById('brutalReadout').innerText = `MEAN: ${mean.toFixed(2)} | VAR: ${variance.toFixed(2)} | PEAK: ${(peak.y * 100).toFixed(1)}%`;
    } else {
        // Line chart for continuous
        mainCtx.beginPath();
        points.forEach((p, i) => {
            const canvasX = padding + ((p.x - xMin) / (xMax - xMin)) * plotWidth;
            const canvasY = height - padding - (p.y / maxY) * plotHeight;
            if (i === 0) mainCtx.moveTo(canvasX, canvasY);
            else mainCtx.lineTo(canvasX, canvasY);
        });
        mainCtx.strokeStyle = FG;
        mainCtx.stroke();
        
        // Fill under
        mainCtx.lineTo(padding + plotWidth, height - padding);
        mainCtx.lineTo(padding, height - padding);
        mainCtx.fillStyle = ACCENT;
        mainCtx.fill();

        const mean = dist.mean(params);
        const variance = dist.variance(params);
        const peak = points.reduce((prev, current) => (prev.y > current.y) ? prev : current);
        document.getElementById('brutalReadout').innerText = `MEAN: ${mean.toFixed(2)} | VAR: ${variance.toFixed(2)} | PEAK: ${peak.y.toFixed(3)}`;
    }
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper && mainCanvas) {
        mainCanvas.width = wrapper.clientWidth;
        mainCanvas.height = wrapper.clientHeight;
    }
}

// TEASER ANIMATION
function runTeaser() {
    if (!teaserCtx) return;
    teaserCanvas.width = teaserCanvas.parentElement.clientWidth;
    teaserCanvas.height = teaserCanvas.parentElement.clientHeight;
    
    let t = 0;
    function animate() {
        if (document.getElementById('home').classList.contains('active')) {
            const mu = Math.sin(t) * 5;
            const sigma = 1.5 + Math.cos(t * 0.5) * 1;
            
            teaserCtx.clearRect(0, 0, teaserCanvas.width, teaserCanvas.height);
            teaserCtx.strokeStyle = FG;
            teaserCtx.lineWidth = 4;
            teaserCtx.fillStyle = ACCENT;
            
            const padding = 40;
            const w = teaserCanvas.width - 2 * padding;
            const h = teaserCanvas.height - 2 * padding;
            
            teaserCtx.beginPath();
            for (let i = 0; i <= 100; i++) {
                const xVal = -10 + (i / 100) * 20;
                const yVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((xVal - mu) / sigma, 2));
                const cx = padding + (i / 100) * w;
                const cy = teaserCanvas.height - padding - (yVal / 0.5) * h;
                if (i === 0) teaserCtx.moveTo(cx, cy);
                else teaserCtx.lineTo(cx, cy);
            }
            teaserCtx.lineTo(padding + w, teaserCanvas.height - padding);
            teaserCtx.lineTo(padding, teaserCanvas.height - padding);
            teaserCtx.stroke();
            teaserCtx.fill();
            
            t += 0.05;
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// STARTUP
window.onload = () => {
    const hash = window.location.hash.substring(1) || 'home';
    switchView(hash);
    runTeaser();
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        render();
    });
};
