# LearnPD

Interactive visualiser for probability distributions. Drag sliders, watch curves update in real time, see mean and variance change live.

Live: [prob-brut.vercel.app](https://prob-brut.vercel.app)

![demo](https://media.giphy.com/media/PiQejEf31116URju4a/giphy.gif)

---

## What it does

Turns abstract probability math into something you can interact with. Pick a distribution, adjust its parameters, and the canvas redraws instantly. Designed for students and developers who want to build intuition, not just memorise formulas.

---

## Distributions

**Continuous**
- Normal (Gaussian)
- Uniform
- Exponential

**Discrete**
- Bernoulli
- Binomial
- Poisson

---

## Stack

Pure browser — no frameworks, no build step required.

- HTML5
- CSS3
- Vanilla JavaScript + Canvas API

Math accuracy notes:
- Logarithmic combinations for large binomial coefficients (avoids factorial overflow)
- Abramowitz-Stegun approximation for Normal CDF
- Auto-scaling axes based on distribution parameters

---

## Getting started

```bash
git clone https://github.com/4shil/LearnPD.git
cd LearnPD
open index.html
```

Or just visit the live site.

---

## Project structure

```
src/
  main.js           # App bootstrap
  style.css
  core/
    state.js        # App state
  math/
    dist.js         # PDF, PMF, CDF implementations
  renderer/
    canvas.js       # Canvas drawing engine
  ui/
    controller.js   # Slider and event handlers
public/
  manifest.json     # PWA manifest
```

---

## License

MIT
