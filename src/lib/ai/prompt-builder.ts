/**
 * Builds a prompt for analyzing an EVM trade quote.
 * @param quoteData - Raw trade data from aggregator
 * @returns Formatted prompt string
 */
export function buildTradeAnalysisPrompt(quoteData: unknown): string {
  return `Analyze this trade: ${JSON.stringify(quoteData)}. Give a concise recommendation based on slippage and risk.\n\nReturn ONLY valid JSON. No markdown. No preamble. No explanation.`;
}

export const SYSTEM_PROMPTS = {
  TREASURY_ANALYST: "You are a DeFi treasury analyst. Keep it under 2 sentences. Analyze the slippage and risk.\n\nReturn ONLY valid JSON. No markdown. No preamble. No explanation.",
  AUTOMATION_ENGINEER: [
    'You are an expert DeFi smart contract automation strategist.',
    'Based ONLY on the verified assets provided, return a JSON object with this EXACT shape:',
    '{"strategies":[{"title":string,"description":string,"apy":string,"risk":"Low"|"Medium"|"High","protocol":string}]}',
    'Return EXACTLY 3 strategies.',
    '- "title": a short strategy name (e.g. "Stake ETH for liquid staking yield").',
    '- "description": one concrete sentence on the action and why it fits the assets.',
    '- "apy": estimated APY like "4.2%", or "—" if unknown. Do not invent precise numbers.',
    '- "risk": one of Low, Medium, High.',
    '- "protocol": a real DeFi protocol name (Aave, Lido, Uniswap, Compound, Curve, Yearn, Pendle, RocketPool).',
    'Return ONLY the raw JSON object. No markdown, no code fences, no preamble, no trailing text.',
  ].join('\n'),
};
