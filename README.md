# Lab Automation Payback

A calculator that estimates when automating a lab workflow step pays for itself.

## Why

Lab automation is usually pitched on throughput, but the decision gets made on cost. Whether a liquid handler or automated sample store pays back depends mostly on volume, how much hands-on time it actually removes, and the running costs people forget (service contracts, extra consumables). This tool puts those in one place.

## What it calculates

- **Net savings per year** = labor time saved + fewer reruns - service contract - extra consumables
- **Payback** = upfront cost divided by monthly net savings
- **Staff time freed**, in hours and full-time equivalents (1,800 hours per FTE)
- **Break-even volume**: the samples per day needed to pay back within 3 years
- A 5-year cash chart and a chart of how payback changes with volume

## What it doesn't capture

Traceability, audit readiness, consistency between operators, and room to grow without hiring are often the real reasons to automate. When payback is borderline, those usually decide it. It also ignores validation downtime and the early learning curve.

The presets use illustrative numbers, not data from any company.

## Run it

It's plain HTML, CSS, and JavaScript with no build step. Open `index.html` in a browser.
