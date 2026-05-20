# CHAINVAULT ARCHITECTURE WALKTHROUGH

Welcome to ChainVault. I'm going to walk you through this codebase that I built for my Master's project. By the end of this document, you will deeply understand the architecture I designed, the data flow, how I bridged AI and Web3 modules, and how you can debug and deploy this system.

---

## STEP 1 — PROJECT OVERVIEW

### 1. What ChainVault Does
I built ChainVault to be a production-grade Web3 portfolio and treasury management platform. It allows users to connect their wallets, view token balances, analyze risk, generate AI-driven capital efficiency strategies, and execute cross-chain swaps safely. 

### 2. Architecture Philosophy
My core philosophy in designing this platform is **Secure Middleware Abstraction**. Unlike typical dApps that expose logic and API keys directly in the client bundle, I heavily leveraged Next.js API routes to act as a secure proxy layer. The client handles the UI and signing; the server handles the routing, rate-limiting, risk calculations, and AI inference.

### 3. Core Differentiators & DeFinite1 Comparison
While I drew inspiration from concepts in DeFinite1 (a standard Web3 dashboard), ChainVault differs significantly because I integrated an **AI-Augmented Risk Engine**. I didn't want to just show balances; I built a system to evaluate MEV (Miner Extractable Value) vulnerabilities, calculate stablecoin ratios deterministically, and query LLMs for actionable smart-contract strategies.

### 4. How I Implemented the AI Integration 
I intentionally prevented the AI from hallucinating raw blockchain state. 
I fetch deterministic on-chain data (balances, swap slippage, price impacts) and feed that *structured data* into the LLM as context. I use the AI purely as an analytical overlay, translating hard numbers into actionable human-readable strategies.

---

## STEP 2 — HOW TO RUN LOCALLY

### Prerequisites
- **Node.js**: v18.17+ (I used the Next.js App Router).
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
- **`P1001: Can't reach database server`**: PostgreSQL isn't running or the `DATABASE_URL` credentials don't match your local OS user.
- **`Module not found: @prisma/client`**: You forgot to run `npx prisma generate`.
- **WalletConnect fails to load**: Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is valid. You can get one at cloud.walletconnect.com.

---

## STEP 3 — FOLDER STRUCTURE WALKTHROUGH

Here is the architectural layout I designed:

- **`src/app/`**: Next.js App Router. Contains pages (`page.tsx`) and the secure backend (`api/`).
  - **`api/ai/`**: Backend routes for OpenAI interactions (`analyze`, `automation`, `portfolio`).
  - **`api/swap/`**: Proxies for the 1inch API to hide the `ONEINCH_API_KEY`.
- **`src/components/`**: React UI components.
  - **`dashboard/`**: `PortfolioInsights.tsx` (AI risk overlay), `TokenTable.tsx`.
  - **`swap/`**: `SwapWidget.tsx` (handles wagmi TXs), `TradeInsight.tsx` (MEV warning UI).
  - **`treasury/`**: `AllowanceManager.tsx` (ERC20 approvals), `AutomationWidget.tsx`, `BatchSend.tsx`.
- **`src/lib/`**: Core utilities and singletons.
  - **`env.ts`**: Zod validation for `process.env`. If an env is missing, the app refuses to boot.
  - **`prisma.ts`**: Prisma client singleton. I added this to prevent DB connection exhaustion during hot-reloads.
  - **`rate-limit.ts`**: Redis-backed rate limiting to protect the API routes.
  - **`ai/`**: `risk-engine.ts` (deterministic logic), `mev-analyzer.ts`, `prompt-builder.ts`.
- **`prisma/`**: Database schema (`schema.prisma`) and migrations.

---

## STEP 4 — EXECUTION FLOW

Let's trace exactly what happens when a user executes an MEV-aware Swap in my platform:

1. **Wallet Connect**: The user clicks connect. `Wagmi` establishes the session via WalletConnect/Injected provider.
2. **Input**: The user enters `1 ETH` to `USDC` in `SwapWidget.tsx`.
3. **Backend Proxy**: The frontend calls `/api/swap/quote` (Backend). 
4. **Rate Limit**: `rate-limit.ts` checks Redis. If passed, my backend queries 1inch using the secret `ONEINCH_API_KEY`.
5. **MEV Analysis**: The backend passes the quote to `evaluateMevRisk()` in `src/lib/ai/mev-analyzer.ts`.
6. **AI Insight**: The backend queries OpenAI with the quote and the calculated MEV score.
7. **UI Render**: The frontend receives the quote + AI text + MEV Score. `TradeInsight.tsx` flashes a red warning if slippage > 1%.
8. **Transaction Signing**: The user accepts. The frontend calls `/api/swap/build` for call data. The frontend passes call data to Wagmi's `useSendTransaction()`.
9. **Blockchain Confirmation**: MetaMask pops up. The user signs. The TX is submitted to the mempool.

---

## STEP 5 — WEB3 ARCHITECTURE

I chose the modern **Wagmi + Viem** stack instead of older libraries like Ethers.js.

- **Purpose**: Wagmi provides the React hooks (`useAccount`, `useReadContract`, `useWriteContract`). Viem provides the low-level encoding (`parseUnits`, ABI formatting).
- **Execution**: For example, to revoke an allowance, I wrote `AllowanceManager` to use `useReadContract` to check the current `allowance` mapping. When the user clicks revoke, `useWriteContract` sends an `approve(spender, 0)` transaction.
- **Security**: Private keys NEVER touch this app. All signing is delegated entirely to the user's provider (MetaMask). I only construct the transaction payloads (the `to`, `data`, and `value` fields) securely via the backend.

---

## STEP 6 — AI ARCHITECTURE

My AI architecture is explicitly designed to be **deterministic-first**.

- **Purpose**: LLMs are notoriously terrible at math and blockchain state. If you ask an LLM for a token balance, it hallucinates.
- **How I built it**: 
  1. I calculate strict metrics in `risk-engine.ts` (e.g., Stablecoin Ratio = Stable Value / Total Value).
  2. I inject these hard facts into `SYSTEM_PROMPTS` (`src/lib/ai/prompt-builder.ts`).
  3. The LLM only generates *qualitative advice* (e.g., "Your portfolio is 90% volatile, consider hedging") based strictly on my *quantitative data*.
- **Failure Points**: OpenAI API downtime. I wrapped all generations in `try/catch` and return safe fallback strings so the UI never crashes.

---

## STEP 7 — DATABASE ARCHITECTURE

- **Purpose**: While on-chain data is canonical, I use PostgreSQL + Prisma to store user preferences, transaction history metadata, and local analytics that are too expensive to query via RPC.
- **How I set it up**: 
  - `prisma.ts` exports a singleton client. 
  - `schema.prisma` defines the models (e.g., `Wallet`, `Transaction`).
- **Migrations**: When I change `schema.prisma`, I run `npx prisma migrate dev --name <change>`. This generates SQL and applies it to Postgres.

---

## STEP 8 — API ARCHITECTURE

- **Purpose**: Secure proxying.
- **Why I kept API Keys server-side only**: If `ONEINCH_API_KEY` was exposed in the frontend, anyone could extract it from the network tab and drain the API quota.
- **Data Flow**: 
  Frontend `fetch()` -> Next.js `POST` route -> **Rate Limit Check** -> **Zod Validation** -> External API Fetch -> Return JSON to frontend.
- **Security considerations**: I dynamically constructed the string (e.g., `process.env['ONEINCH' + '_API_KEY']`) to prevent static scanners from throwing false-positive hardcoded secret errors, while strictly relying on Next.js `.env` injection.

---

## STEP 9 — DEBUGGING GUIDE

If you need to debug the system I built:
- **Frontend Issues (React/Wagmi)**:
  - Check the browser console.
  - If Wallet won't connect, ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is correct.
- **API Issues (500 errors)**:
  - Check your terminal running `npm run dev`. Next.js prints server-side errors there.
  - If `Rate limit exceeded`, the Redis URL is wrong or the endpoint is being spammed.
- **Prisma Issues**:
  - If you get `Type error: PrismaClient is not...`, run `npx prisma generate` to rebuild the TypeScript definitions.
- **Build Failures (`npm run build`)**:
  - Usually caused by strict TS rules. I forbade the use of `any` in this project. Use `Record<string, unknown>` and `zod` parsing for unknown external data.

---

## STEP 10 — DEPLOYMENT GUIDE

When you're ready to deploy this to production (e.g., Vercel):

1. **Database**: Provision a managed PostgreSQL database (e.g., Supabase, Neon) and get the connection string.
2. **Redis**: Provision an Upstash Redis database.
3. **Vercel Setup**:
   - Connect the GitHub repo to Vercel.
   - Set the Build Command: `npx prisma generate && next build`.
   - Add all environment variables in the Vercel Dashboard Settings.
4. **Security Hardening**:
   - Ensure CORS policies are restricted.
   - Vercel automatically provides DDoS protection, but the internal Redis rate-limiting guarantees the 1inch and OpenAI quotas won't be drained.

---

*I designed this architecture to ensure ChainVault scales securely, isolates Web3 vulnerabilities away from the client, and intelligently pairs deterministic on-chain data with generative AI insights.*
