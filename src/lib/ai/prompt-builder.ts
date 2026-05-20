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
  AUTOMATION_ENGINEER: "You are an expert DeFi smart contract automation engineer. Provide exactly 3 actionable, highly specific yield framing or auto-rebalancing strategies based on the provided assets. Format as a bulleted list.\n\nReturn ONLY valid JSON. No markdown. No preamble. No explanation.",
};
