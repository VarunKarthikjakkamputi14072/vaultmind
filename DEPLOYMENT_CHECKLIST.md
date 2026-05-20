# ChainVault Deployment Checklist (Free Tier)

To deploy ChainVault out to the world for free, you need to swap out your local development variables with production-ready cloud services. Fortunately, modern Web3 and AI infrastructure offer extremely generous free tiers.

Here is your exact task list to get this live:

## 1. Get Free API Keys
- [ ] **WalletConnect Project ID (Free):** 
  - Go to [cloud.walletconnect.com](https://cloud.walletconnect.com/).
  - Create a new project to get your `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- [ ] **1inch Swap API (Free Tier):**
  - Go to the [1inch Developer Portal](https://portal.1inch.dev/).
  - Sign up and generate an API key for routing and quoting (`ONEINCH_API_KEY`).
- [ ] **OpenAI API Key (Low Cost / Free Alternatives):**
  - *Option A:* Use [OpenAI](https://platform.openai.com/). It's not completely free, but $5 of pre-paid credits will last months for this specific use case. (`OPENAI_API_KEY`).
  - *Option B (100% Free Alternative):* Use [Groq](https://console.groq.com/) or [Google Gemini](https://aistudio.google.com/). *Note: If you use these, you will need to tweak the `src/app/api/ai/...` routes to use the `@ai-sdk/google` or `@ai-sdk/groq` provider instead of `@ai-sdk/openai`.*

## 2. Setup Free Cloud Infrastructure
- [ ] **PostgreSQL Database (Free Tier):**
  - Go to [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).
  - Create a free project and copy the connection string.
  - Set this as your `DATABASE_URL`.
  - *Crucial Step:* Append `?pgbouncer=true&connection_limit=1` to the URL if deploying on Serverless platforms.
- [ ] **Redis Rate Limiting (Free Tier):**
  - Go to [Upstash](https://upstash.com/).
  - Create a free Redis database and copy the `REDIS_URL`.

## 3. Deployment on Vercel
- [ ] **Create a Vercel Account (Free):**
  - Go to [Vercel](https://vercel.com/) and sign in with GitHub.
- [ ] **Import the Repository:**
  - Import your `ChainVault` repository.
- [ ] **Configure Environment Variables:**
  - Before clicking "Deploy", go to the "Environment Variables" section.
  - Paste in all 5 keys:
    - `DATABASE_URL`
    - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
    - `ONEINCH_API_KEY`
    - `OPENAI_API_KEY`
    - `REDIS_URL`
- [ ] **Set the Build Command:**
  - Vercel usually detects Next.js automatically. However, to ensure Prisma generates correctly, override the Build Command to: 
    ```bash
    npx prisma generate && next build
    ```
- [ ] **Deploy:**
  - Click Deploy. Once it finishes, Vercel will give you a live public URL (e.g., `chainvault.vercel.app`).

## 4. Final Verification
- [ ] Open the public Vercel link.
- [ ] Connect a live wallet (MetaMask, Phantom, etc.).
- [ ] Test the AI automation and risk engine to ensure API keys are routing correctly.
- [ ] Test an allowance revocation to ensure Wagmi is reading the blockchain properly.
