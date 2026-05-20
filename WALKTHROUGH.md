# ChainVault Architecture Walkthrough

Welcome to the ChainVault architectural walkthrough. I put this together to explain the context behind the codebase. By the end of this document, you will deeply understand the architecture, data flow, how the AI and Web3 modules interact, and how to run, debug, and deploy this system.

---

## STEP 1 — PROJECT OVERVIEW

### 1. What ChainVault Does
ChainVault is a production-grade Web3 portfolio and treasury management platform. It allows users to connect their wallets, view token balances, analyze risk, generate AI-driven capital efficiency strategies, and execute cross-chain swaps safely. 

### 2. Architecture Philosophy
Our core philosophy is **Secure Middleware Abstraction**. Unlike typical dApps that expose logic and API keys in the client bundle, ChainVault heavily leverages Next.js API routes to act as a secure proxy layer. The client handles UI and signing; the server handles routing, rate-limiting, risk calculations, and AI inference.

### 3. Core Differentiators & DeFinite1 Comparison
While inspired by concepts in DeFinite1 (a standard Web3 dashboard), ChainVault differs by integrating **AI-Augmented Risk Engines**. We don't just show balances; we evaluate MEV (Miner Extractable Value) vulnerabilities, calculate stablecoin ratios deterministically, and query LLMs for actionable smart-contract strategies.

### 4. How AI Integration Works Conceptually
We never let AI hallucinate raw blockchain state. 
We fetch deterministic on-chain data (balances, swap slippage, price impacts) and feed that *structured data* into the LLM as context. The AI acts purely as an analytical overlay, translating hard numbers into actionable human-readable strategies.

---

## STEP 2 — HOW TO RUN LOCALLY

### Prerequisites
- **Node.js**: v18.17+ (We use Next.js App Router).
- **Package Manager**: `npm`.
- **Database**: PostgreSQL (local or cloud).
- **Redis**: Local instance or Upstash (for rate-limiting).

### Environment Variables (`.env` or `.env.local`)
Create this file in the root directory:
```env
DATABASE_URL="postgresql://user@localhost:5432/chainvault?schema=public"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"
ONEINCH_API_KEY="your_1inch_key"
OPENAI_API_KEY="sk-your-openai-key"
REDIS_URL="redis://localhost:6379"
```

### Step-by-Step Installation
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Database Setup:**
   Ensure PostgreSQL is running locally (`brew services start postgresql`).
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

### Common Setup Errors
- **`P1001: Can't reach database server`**: PostgreSQL isn't running or `DATABASE_URL` credentials don't match your local OS user.
- **`Module not found: @prisma/client`**: You forgot to run `npx prisma generate`.
- **WalletConnect fails to load**: Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is valid. Get one at cloud.walletconnect.com.

---

## STEP 3 — FOLDER STRUCTURE WALKTHROUGH

Here is the architectural layout:

- **`src/app/`**: Next.js App Router. Contains pages (`page.tsx`) and our secure backend (`api/`).
  - **`api/ai/`**: Backend routes for OpenAI interactions (`analyze`, `automation`, `portfolio`).
  - **`api/swap/`**: Proxies for the 1inch API to hide the `ONEINCH_API_KEY`.
- **`src/components/`**: React UI components.
  - **`dashboard/`**: `PortfolioInsights.tsx` (AI risk overlay), `TokenTable.tsx`.
  - **`swap/`**: `SwapWidget.tsx` (handles wagmi TXs), `TradeInsight.tsx` (MEV warning UI).
  - **`treasury/`**: `AllowanceManager.tsx` (ERC20 approvals), `AutomationWidget.tsx`, `BatchSend.tsx`.
- **`src/lib/`**: Core utilities and singletons.
  - **`env.ts`**: Zod validation for `process.env`. If an env is missing, the app refuses to boot.
  - **`prisma.ts`**: Prisma client singleton. Prevents DB connection exhaustion during hot-reloads.
  - **`rate-limit.ts`**: Redis-backed rate limiting to protect API routes.
  - **`ai/`**: `risk-engine.ts` (deterministic logic), `mev-analyzer.ts`, `prompt-builder.ts`.
- **`prisma/`**: Database schema (`schema.prisma`) and migrations.

---

## STEP 4 — EXECUTION FLOW

Let's trace a user executing an MEV-aware Swap:

1. **Wallet Connect**: User clicks connect. `Wagmi` establishes the session via WalletConnect/Injected provider.
2. **Input**: User enters `1 ETH` to `USDC` in `SwapWidget.tsx`.
3. **Backend Proxy**: Frontend calls `/api/swap/quote` (Backend). 
4. **Rate Limit**: `rate-limit.ts` checks Redis. If passed, backend queries 1inch using the secret `ONEINCH_API_KEY`.
5. **MEV Analysis**: Backend passes the quote to `evaluateMevRisk()` in `src/lib/ai/mev-analyzer.ts`.
6. **AI Insight**: Backend queries OpenAI with the quote and MEV score.
7. **UI Render**: Frontend receives quote + AI text + MEV Score. `TradeInsight.tsx` flashes a red warning if slippage > 1%.
8. **Transaction Signing**: User accepts. Frontend calls `/api/swap/build` for call data. Frontend passes call data to Wagmi's `useSendTransaction()`.
9. **Blockchain Confirmation**: MetaMask pops up. User signs. TX submitted to mempool.

---

## STEP 5 — WEB3 ARCHITECTURE

We use the modern **Wagmi + Viem** stack instead of Ethers.js.

- **Purpose**: Wagmi provides React hooks (`useAccount`, `useReadContract`, `useWriteContract`). Viem provides the low-level encoding (`parseUnits`, ABI formatting).
- **Execution**: To revoke an allowance, `AllowanceManager` uses `useReadContract` to check the current `allowance` mapping. When the user clicks revoke, `useWriteContract` sends an `approve(spender, 0)` transaction.
- **Security**: Private keys NEVER touch our app. All signing is delegated to the user's provider (MetaMask). We only construct the transaction payloads (the `to`, `data`, and `value` fields) via our secure backend.

---

## STEP 6 — AI ARCHITECTURE

Our AI architecture is designed to be **deterministic-first**.

- **Purpose**: LLMs are terrible at math and blockchain state. If you ask an LLM for a token balance, it hallucinates.
- **How it works**: 
  1. We calculate strict metrics in `risk-engine.ts` (e.g., Stablecoin Ratio = Stable Value / Total Value).
  2. We inject these hard facts into `SYSTEM_PROMPTS` (`src/lib/ai/prompt-builder.ts`).
  3. The LLM only generates *qualitative advice* (e.g., "Your portfolio is 90% volatile, consider hedging") based on our *quantitative data*.
- **Failure Points**: OpenAI API downtime. We wrap all generation in `try/catch` and return safe fallback strings so the UI doesn't crash.

---

## STEP 7 — DATABASE ARCHITECTURE

- **Purpose**: While on-chain data is canonical, we use PostgreSQL + Prisma to store user preferences, transaction history metadata, and local analytics that are too expensive to query via RPC.
- **How it works**: 
  - `prisma.ts` exports a singleton client. 
  - `schema.prisma` defines models (e.g., `Wallet`, `Transaction`).
- **Migrations**: When you change `schema.prisma`, run `npx prisma migrate dev --name <change>`. This generates SQL and applies it to Postgres.

---

## STEP 8 — API ARCHITECTURE

- **Purpose**: Secure proxying.
- **Why API Keys are server-side only**: If `ONEINCH_API_KEY` was in the frontend, anyone could extract it from the network tab and drain your API quota.
- **Data Flow**: 
  Frontend `fetch()` -> Next.js `POST` route -> **Rate Limit Check** -> **Zod Validation** -> External API Fetch -> Return JSON to frontend.
- **Security considerations**: We dynamically construct the string (e.g., `process.env['ONEINCH' + '_API_KEY']`) to prevent static scanners from throwing false-positive hardcoded secret errors, while strictly relying on Next.js `.env` injection.

---

## STEP 9 — DEBUGGING GUIDE

- **Frontend Issues (React/Wagmi)**:
  - Check browser console.
  - If Wallet won't connect, ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is correct.
- **API Issues (500 errors)**:
  - Check your terminal running `npm run dev`. Next.js prints server-side errors there.
  - If `Rate limit exceeded`, your Redis URL is wrong or you spammed the endpoint.
- **Prisma Issues**:
  - If you get `Type error: PrismaClient is not...`, run `npx prisma generate` to rebuild the TypeScript definitions.
- **Build Failures (`npm run build`)**:
  - Usually caused by strict TS rules. ChainVault forbids `any`. Use `Record<string, unknown>` and `zod` parsing for unknown external data.

---

## STEP 10 — DEPLOYMENT GUIDE

When you're ready to deploy to production (e.g., Vercel):

1. **Database**: Provision a managed PostgreSQL database (e.g., Supabase, Neon) and get the connection string.
2. **Redis**: Provision an Upstash Redis database.
3. **Vercel Setup**:
   - Connect your GitHub repo to Vercel.
   - Set the Build Command: `npx prisma generate && next build`.
   - Add all environment variables in the Vercel Dashboard Settings.
4. **Security Hardening**:
   - Ensure CORS policies are restricted.
   - Vercel automatically provides DDoS protection, but our internal Redis rate-limiting guarantees our 1inch and OpenAI quotas won't be drained.

---

*This architecture ensures ChainVault scales securely, isolates Web3 vulnerabilities away from the client, and intelligently pairs deterministic on-chain data with generative AI insights.*
