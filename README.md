# 📊 LearnPD

<div align="center">

![LearnPD Banner](https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYW9rNGw4bWl2eXJiMnM4OHZhdmFuNGU1d2JoaXFueGZvNDhnM3NhZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PiQejEf31116URju4a/giphy.gif)

**Probability distributions, but make it actually fun to learn.**

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-prob--brut.vercel.app-black?style=for-the-badge)](https://prob-brut.vercel.app)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Canvas API](https://img.shields.io/badge/Canvas-API-FF6B35?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Neo Brutalist](https://img.shields.io/badge/Design-Neo%20Brutalist-000000?style=for-the-badge)](https://hype4.academy/articles/design/neobrutalism-is-taking-over-web)

</div>

---

## What is LearnPD?

Remember staring at stats textbooks trying to understand *why* a normal distribution looks like a bell curve, or *how* changing the lambda of a Poisson distribution shifts things? LearnPD turns those abstract concepts into something you can actually touch.

Drag a slider. Watch the curve move in real time. See the mean and variance update instantly. Statistics suddenly makes sense.

Zero frameworks. Zero dependencies. Just the browser doing what it does best.

---

## ✨ Features

- 🎛️ **Interactive Sliders** — Tweak distribution parameters and watch everything update live
- 📈 **6 Core Distributions** — Covers the ones you actually need to know
- 🧮 **Live Stats** — Mean, variance, and peak values shown in real time
- 🎨 **Neo-Brutalist Design** — High-contrast, bold, and built to keep your attention
- 🏎️ **Zero Dependencies** — Pure HTML, CSS, JS and Canvas API. No bundler drama
- 📐 **Mathematically Accurate** — Proper overflow handling, log-space binomial coefficients, Abramowitz-Stegun erf approximation

---

## 📚 Distributions Included

### Continuous
| Distribution | What it models |
|---|---|
| **Normal (Gaussian)** | Heights, test scores, measurement errors — the classic bell curve |
| **Uniform** | Anything that's equally likely across a range (e.g., rolling a fair die conceptually) |
| **Exponential** | Time until the next bus, the next earthquake, the next email |

### Discrete
| Distribution | What it models |
|---|---|
| **Bernoulli** | A single coin flip — success or failure |
| **Binomial** | How many heads in 10 coin flips |
| **Poisson** | How many customers walk into a shop per hour |

---

## 🛠️ Tech Stack

Built intentionally lean:

- **HTML5** — Semantic structure
- **CSS3** — Neo-brutalist styling, no utility frameworks
- **Vanilla JavaScript** — Canvas API for rendering, pure math for distributions

No React. No Vue. No bundler required. Proof that the platform is powerful enough on its own.

---

## 🚀 Getting Started

```bash
git clone https://github.com/4shil/LearnPD.git
cd LearnPD
# Open index.html in your browser — that's it
open index.html
```

Or just visit the live site: **[prob-brut.vercel.app](https://prob-brut.vercel.app)**

---

## 📁 Project Structure

```
LearnPD/
├── index.html              # Entry point
├── src/
│   ├── main.js             # App bootstrap
│   ├── style.css           # Neo-brutalist styles
│   ├── core/
│   │   └── state.js        # App state management
│   ├── math/
│   │   └── dist.js         # PDF/PMF/CDF math implementations
│   ├── renderer/
│   │   └── canvas.js       # Canvas drawing engine
│   └── ui/
│       └── controller.js   # Slider & UI event handlers
└── public/
    └── manifest.json       # PWA manifest
```

---

## 🎓 Who is this for?

- Students taking their first stats or probability course
- Developers wanting a visual intuition for ML/data science concepts
- Anyone who learns better by doing than by reading

---

## 🤝 Contributing

Found a distribution you'd love to see? Better visualisation idea? Open an issue or send a PR — all contributions welcome.

---

## 📜 License

MIT — free to use, fork, and learn from.

---

<div align="center">
  Made with 📐 and a healthy fear of statistics by <a href="https://github.com/4shil">4shil</a>
</div>
