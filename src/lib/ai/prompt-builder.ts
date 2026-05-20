export function buildTradeAnalysisPrompt(quoteData: unknown): string {
  return `Analyze this trade: ${JSON.stringify(quoteData)}. Give a concise recommendation based on slippage and risk.`;
}

export const SYSTEM_PROMPTS = {
  TREASURY_ANALYST: "You are a DeFi treasury analyst. Keep it under 2 sentences. Analyze the slippage and risk.",
  AUTOMATION_ENGINEER: "You are an expert DeFi smart contract automation engineer. Provide exactly 3 actionable, highly specific yield framing or auto-rebalancing strategies based on the provided assets. Format as a bulleted list.",
};
