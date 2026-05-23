# LearnPD — Interactive Probability Distribution Explorer

LearnPD is a premium, visually-driven web application designed to help students, educators, and statistics enthusiasts build an intuitive, mathematically rigorous understanding of probability distributions.

Built with a high-contrast Neo-Brutalist aesthetic and micro-animations, the application provides real-time exploration, mathematical calculations, an interactive parameters matching quiz, and a Central Limit Theorem (CLT) sampling simulator.

---

## 🚀 Key Features

* **Interactive Sandbox Explorer:** Live visual parameter manipulation of core distributions with instant curve updates and custom magnetic tooltips.
* **14 Bounded Distribution Models:** Out of the box support for 14 distributions (Normal, Uniform, Bernoulli, Binomial, Poisson, Exponential, Geometric, Hypergeometric, Gamma, Beta, Chi-Square, Log-Normal, Student's T, Weibull).
* **CLT Sampling Simulator:** An asynchronous animation engine that simulates draw iterations, charts the distribution of sample means, and visually proves the Law of Large Numbers (LLN) and Central Limit Theorem.
* **Curve-Matching Quiz Challenge:** Interactive quiz module with conceptual questions and real-time distribution shape-matching exercises.
* **Visual Data Exporters:** Exporter hooks to download high-resolution PNG charts and raw mathematical probability distribution tables as CSV files.

---

## 🛠️ Tech Stack & Architecture

* **Core UI:** Vanilla HTML5, Vanilla JavaScript (ES Modules), Google Fonts (Inter, Outfit, JetBrains Mono).
* **Render Pipeline:** HTML5 Canvas API with full high-DPI scaling (Retina display support) and double-buffering layouts.
* **Animations:** GSAP (GreenSock Animation Platform) for views transitions and Lenis for smooth scroll kinetics.
* **State Management:** Strict Reactive Store implementation using the observer pattern.
* **Math Library:** Custom high-precision math library implementing log-space expansions for factorials and combinations to prevent overflows.
* **Testing:** Vitest framework for distribution accuracy and renderer scaling checks.

---

## 🔬 Mathematical Accuracy & Stability

* **Log-Space Calculations:** Large trial Binomial PMF/CDF and large rate Poisson PMF/CDF sums are calculated using `logGamma` and `logCombination` expansions to avoid floating-point multiplication overflows (`Infinity` or `NaN`).
* **Boundary Safeguards:** Full boundary parameter validation (e.g., shape parameters, standard deviation σ > 0, scale parameter λ > 0) to ensure mathematical formulas are robust against edge-case slider inputs.
* **Safe Number Formatters:** The operation calculators gracefully format `NaN` and `Infinity` inputs to translate them to readable format symbols (e.g. `'NaN'`, `'∞'`) without throwing standard JavaScript `RangeError` exceptions.

---

## ⚙️ Layout Loop Prevention (ResizeObserver)

Canvases are decoupled from parent layout flows using absolute positioning and dimension-cache guards:
```javascript
// Renderer.resize()
if (this.width === width && this.height === height) {
    return false; // Skip execution if layout sizes are identical
}
```
This breaks rendering feedback loops and guarantees that switching tabs, rotating viewports, or resizing windows never collapses canvases to `1x1` or expands them infinitely.

---

## 📦 Installation & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Local Development Server
```bash
npm run dev
```

### 3. Run Automated Tests
Execute the Vitest suite to verify calculations accuracy and renderer responsiveness:
```bash
npm run test
```

---

## 🎯 Educational Value

* Build instant graphical intuition on how parameters like shape, scale, mean, and variance skew distribution curves.
* Watch the Central Limit Theorem come to life as skewed source distributions generate standard Gaussian curves as sample sizes increase.
* Engage with distribution shapes dynamically rather than reading static formulas from a textbook.
