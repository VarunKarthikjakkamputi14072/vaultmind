# VaultMind
### Intelligent DeFi Management

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-16-black)]()
[![Gemini](https://img.shields.io/badge/Inference-Gemini_2.5_Flash-blue)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**[Live Demo →](https://vaultmind.vercel.app)**

---

## Overview
VaultMind is a production-grade Web3 portfolio and treasury management platform. It enables users to monitor multi-chain asset holdings, execute gasless cross-chain swaps, and receive LLM-augmented risk assessments before trade execution — all without surrendering custody of private keys.

## Key Engineering Decisions
- **Provider-agnostic inference waterfall**: The LLM layer uses a cascading fallback chain (Groq → Gemini → Cohere → OpenRouter) ensuring inference availability independent of any single provider's uptime or quota limits. Each attempt has a **per-provider timeout** so a hung provider fails over fast instead of stalling the request.
- **Deterministic pre-scoring**: Portfolio risk is evaluated with a rule-based engine before any LLM call. The LLM only adds natural-language narrative — it never produces the risk score itself. This separates deterministic correctness from probabilistic generation.
- **Cached narratives**: Generated insights are cached in Upstash Redis keyed by a hash of the prompt, so an identical portfolio or quote doesn't re-bill the LLM. Caching fails open — a Redis outage just means a cache miss, never a failed request.
- **Secure middleware abstraction**: All external API calls (swap aggregation, portfolio data, LLM inference) are proxied through Next.js server routes. Zero API keys are exposed to the browser.
- **12-point deployment gate**: validate.sh enforces TypeScript strictness, ESLint compliance, production build, and Prisma schema integrity before every deployment.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design.

## Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Web3 | Wagmi v2 + Viem |
| Inference | Google Gemini 2.5 Flash (@ai-sdk/google) |
| Swap | SwapAPI (swapapi.dev) — keyless, zero-KYC |
| Database | Neon PostgreSQL + Prisma ORM |
| Rate Limiting | Upstash Redis (serverless) |
| Deploy | Vercel + Neon free tier |

## Local Development
```bash
git clone https://github.com/VarunKarthikjakkamputi14072/vaultmind
cd vaultmind
npm install
cp .env.example .env.local  # fill in your keys
npx prisma migrate dev
npm run dev
```

## Tests & CI
The deterministic core (risk engine, MEV analyzer) and the AI plumbing (provider
fallback/timeout, narrative cache) are unit-tested with Vitest — no network or API key
needed, since the AI SDK is mocked and the cache fails open without Redis.

```bash
npm test          # vitest run
npx tsc --noEmit  # strict type check
npx eslint src    # lint
```

GitHub Actions (`.github/workflows/ci.yml`) runs the type check, lint, and tests on every
push and pull request. `validate.sh` still covers the full production build + Prisma gate
before a deploy.
