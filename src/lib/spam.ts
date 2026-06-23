// Shared spam/airdrop heuristics. Used server-side in /api/balances to annotate
// tokens with `possible_spam`, and client-side in the token table as defense in
// depth. Keeping the logic in one place means the rules can't drift apart.

// Well-known token contract addresses (lowercased) that must NEVER be flagged,
// even if their name happens to contain a heuristic trigger (e.g. a legit token
// with ".fi" in the brand). Extend as needed.
const VERIFIED_CONTRACTS = new Set<string>([
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0x5a98fcbea516cf06857215779fd812ca3bef1b32', // LDO
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP
])

const URL_PATTERNS = /\.com|\.io|\.net|\.fi|\.xyz|\.app|\.org|\.finance|https?:|:\/\//i
const BAIT_WORDS    = /\b(claim|airdrop|voucher|visit|invite|reward|bonus|giveaway|rebate)\b/i
const SUSPICIOUS_PREFIX = /^[!@$#*\-+]/

/**
 * Decide whether a token is likely spam/airdrop bait.
 * `address` is the contract address when known (used for the allowlist).
 */
export function isSpamToken(
  name: string,
  symbol: string,
  address?: string | null,
): boolean {
  if (address && VERIFIED_CONTRACTS.has(address.toLowerCase())) return false

  const haystack = `${name} ${symbol}`
  if (URL_PATTERNS.test(haystack)) return true
  if (BAIT_WORDS.test(haystack)) return true
  if (SUSPICIOUS_PREFIX.test(name.trim()) || SUSPICIOUS_PREFIX.test(symbol.trim())) return true
  return false
}

/**
 * Server-side entry point: given a raw token object (any provider shape),
 * return true if it should be flagged. Respects an existing `possible_spam`
 * flag from the upstream provider (e.g. Moralis) and layers heuristics on top.
 */
export function flagSpam(raw: Record<string, unknown>): boolean {
  if (raw.possible_spam === true) return true
  const name    = String(raw.name ?? '')
  const symbol  = String(raw.symbol ?? '')
  const address = (raw.token_address ?? raw.address ?? null) as string | null
  return isSpamToken(name, symbol, address)
}
