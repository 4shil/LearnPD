# PROBABILITY DISTRIBUTION

An interactive, visually-driven web application for exploring probability distributions.

## Features
- **6 Core Distributions:** Normal, Uniform, Bernoulli, Binomial, Poisson, Exponential
- **Accurate Mathematics:** Implements correct PDF/PMF, CDF, mean, and variance calculations
- **Interactive Sliders:** Real-time parameter manipulation with instant visual feedback
- **Statistical Readouts:** Live display of mean, variance, and peak values
- **Neo-Brutalist Design:** High-contrast, accessible interface with bold typography

## Tech Stack
- Vanilla HTML5
- Vanilla CSS3
- Vanilla JavaScript (Canvas API)

## Distributions Included

### Continuous
1. **Normal (Gaussian)** - Bell curve for natural phenomena
2. **Uniform** - Equal probability across an interval
3. **Exponential** - Time between events

### Discrete
4. **Bernoulli** - Single success/failure trial
5. **Binomial** - Number of successes in n trials
6. **Poisson** - Count of rare events

## Accuracy
- Implements proper overflow handling for large factorials
- Uses logarithmic combinations for large binomial coefficients
- Includes Abramowitz-Stegun error function approximation for Normal CDF
- Auto-scales axes based on distribution parameters for optimal viewing

## Deployment
Live at: [https://prob-brut.vercel.app](https://prob-brut.vercel.app)

## Educational Use
Perfect for:
- Statistics courses
- Probability theory demonstrations
- Self-study and intuition building
- Teaching distribution properties
