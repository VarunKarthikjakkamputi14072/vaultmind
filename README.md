# ChainVault

ChainVault is a production-grade Web3 portfolio and treasury management platform. It allows users to connect their wallets, view token balances, analyze risk, generate AI-driven capital efficiency strategies, and execute cross-chain swaps safely. 

## Features
- **AI-Augmented DeFi Risk Engine:** Deterministic MEV checks and AI insights.
- **Secure Proxies:** 1inch and OpenAI APIs securely wrapped in backend Next.js routes.
- **Treasury Management:** Wagmi/Viem integration for robust ERC20 interactions.
- **Rate Limiting:** Redis-backed rate limiting to protect backend resources.

## Documentation
Please refer to the [WALKTHROUGH.md](WALKTHROUGH.md) for a comprehensive deep-dive into the architecture, execution flow, debugging, and deployment strategies.

## Setup

```bash
npm install
npx prisma generate
npm run dev
```
