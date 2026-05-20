# VaultMind Architecture Walkthrough

Welcome to the VaultMind architectural walkthrough. This document is designed to give you a complete, top-to-bottom understanding of how this project works, why specific technologies were chosen, and how data flows between the frontend, the backend proxy, the AI models, and the blockchain.

---

## 1. Project Overview & Philosophy

VaultMind is a production-grade Web3 portfolio and treasury management platform. It allows users to connect their wallets, view token balances, analyze risk, generate AI-driven capital efficiency strategies, execute cross-chain swaps safely, and manage smart contract allowances.

**The Core Philosophy: Secure Middleware Abstraction**
Unlike typical decentralized applications (dApps) that execute logic and expose API keys directly in the user's browser, VaultMind leverages **Next.js API routes as a secure proxy layer**. 
* The **Client** (Browser) only handles rendering the UI and signing transactions via the wallet.
* The **Server** (Next.js APIs) handles all external routing, rate-limiting, risk calculations, and AI inference. This completely protects your API keys from being stolen.

---

## 2. Core Technologies

* **Framework**: Next.js 16 (App Router)
* **Web3 Integration**: Wagmi & Viem (for wallet connection and raw transaction formatting)
* **Database**: Prisma ORM connecting to a Neon PostgreSQL Serverless database.
* **AI Engine**: `@ai-sdk/google` running **Gemini 2.5 Flash** (Free, incredibly fast, no credit card required).
* **Swap Aggregator**: **SwapAPI (swapapi.dev)**, a completely free, keyless, zero-KYC DEX aggregator.
* **Rate Limiting**: `@upstash/redis` (Serverless HTTP Redis) to prevent spam attacks on your API endpoints.

---

## 3. How the AI Integration Works

We never let the AI "hallucinate" raw blockchain state. The AI acts purely as an analytical overlay, translating hard numbers into actionable human-readable strategies.

### A. The Portfolio Risk Engine (`/api/ai/portfolio/route.ts`)
1. The frontend fetches the user's wallet balances (via Moralis/Wagmi) and posts the raw array of tokens to the backend.
2. A deterministic TypeScript script evaluates the tokens (calculating stablecoin ratios and identifying illiquid tokens).
3. The backend formats the top 5 assets and sends them, along with the deterministic risk score, to **Google Gemini 2.5 Flash**.
4. Gemini generates a tailored 2-sentence strategic recommendation.

### B. Smart Treasury Automation (`/api/ai/automation/route.ts`)
1. The frontend posts the user's tokens.
2. The backend filters for "idle assets". It looks for tokens with a USD value > $100. If it can't find any (e.g., if the wallet only has fragmented dust or unpriced tokens), it safely falls back to mapping the raw, formatted token balances.
3. This exact list of assets is injected into a prompt for Gemini 2.5 Flash.
4. Gemini returns 3 highly specific yield farming or staking strategies tailored *exactly* to what the user holds.

---

## 4. Web3 Transaction Execution Flow

### A. AI-Powered Swaps (Zero-KYC via SwapAPI)
VaultMind uses a custom backend proxy to route swaps without relying on 1inch or 0x API keys, bypassing restrictive KYC requirements.
1. **Quote (`/api/swap/quote`)**: User enters "1 ETH". The backend proxies a request to `api.swapapi.dev` and extracts `data.data.expectedAmountOut`. It returns this to the UI to show the user they will receive exactly "3000 USDC".
2. **Build (`/api/swap/build`)**: When the user clicks "Execute", the backend requests the exact smart contract calldata (`to`, `data`, `value`) from SwapAPI.
3. **Sign & Send**: The backend returns the `tx` object to the frontend. The frontend feeds this directly into Wagmi's `useSendTransaction` hook. MetaMask pops up, the user signs, and the swap is broadcast to the Ethereum network.

### B. Manual Treasury Tools (Allowance & Send Assets)
* **Allowance Manager**: Often, dApps ask for "Infinite Approval" to spend your tokens. If that dApp gets hacked, your wallet can be drained. The Allowance Manager is a security firewall that lets you manually query any token/spender pair and forcefully revoke their permission on-chain by dropping their allowance to 0.
* **Send Assets**: A simple manual override to move tokens. Standard wallet UIs sometimes fail to load obscure custom tokens. This component lets you paste the raw contract address, amount, and recipient, giving you 100% manual control to sweep funds to cold storage.

---

## 5. Security & Rate Limiting

Because the AI and Swap routes are public API endpoints, they are vulnerable to spam. 
To protect them, we use **Upstash Redis Serverless**.
Every single route (`/api/ai/analyze`, `/api/swap/build`, etc.) passes the user's IP address into `src/lib/rate-limit.ts`. The script uses the `@upstash/redis` HTTP client to increment a counter. If a user hits "Execute Swap" 10 times in 10 seconds, the Redis layer blocks them with a `429 Too Many Requests` error, protecting your cloud infrastructure from DDoS attacks.

---

## 6. The Master Validation Pipeline

Located at `./validate.sh` in the root of the project, this is a strict 12-point phase gate script used before deployments.
It runs:
1. `tsc --noEmit` (TypeScript strictly checks for type safety).
2. `eslint` (Catches syntax vulnerabilities).
3. `next build` (Ensures the production Turbopack compilation doesn't fail).
4. Prisma Schema Validation (Ensures the database matches the code).

**Rule**: The app is never pushed or deployed unless `validate.sh` outputs "PASSED" at the end.

---

## 7. Vercel Deployment Requirements

When deploying to Vercel, the environment variables must perfectly align with the infrastructure:
1. `DATABASE_URL`: Must be the `postgresql://...` connection string from Neon.
2. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Connects Wagmi to WalletConnect Cloud.
3. `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Connects the rate-limiter over HTTP.
4. `GOOGLE_GENERATIVE_AI_API_KEY`: Connects the `@ai-sdk/google` integration to Gemini.
5. `MORALIS_API_KEY`: Used by the backend to fetch deterministic portfolio data.

*Note: In the Vercel Build Settings, the build command should be overridden to `npx prisma generate && next build` to ensure the ORM is correctly instantiated on the serverless edge.*
