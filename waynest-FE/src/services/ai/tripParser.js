import { isPuterChatAvailable } from "./puter";

const DEFAULT_MODEL = "gpt-5.4-mini";

export async function extractTripFromText(userText, { model } = {}) {
  if (!isPuterChatAvailable()) {
    throw new Error("AI chat not available");
  }

  const prompt = `You are a trip planner AI. Extract trip details from user text in ANY language.

Return ONLY valid JSON with these exact fields:
- "destination": city or place name in English
- "country": country name in English
- "days": number of days as integer (default 3 if not specified)
- "persons": number of travelers as integer (default 2 if not specified)
- "budget": total budget as number (default 500 if not specified)
- "currency": ISO 4217 currency code (e.g. "ILS", "USD", "EUR", "GBP")
- "interests": array of interest keywords in English (empty array if none)

IMPORTANT: Return ONLY the JSON object. No other text, no markdown, no explanation.

Examples:
User: Paris 3 days €200
{"destination":"Paris","country":"France","days":3,"persons":2,"budget":200,"currency":"EUR","interests":[]}

User: اريد الذهاب الى بيت لحم مع شخصين لمدة يومين معي 1000 شيكل
{"destination":"Bethlehem","country":"Palestine","days":2,"persons":2,"budget":1000,"currency":"ILS","interests":[]}

User: ${userText}
`;

  const { puter } = await import("@heyputer/puter.js");
  const response = await puter.ai.chat(prompt, { model: model || DEFAULT_MODEL });

  const raw =
    typeof response === "string"
      ? response
      : response?.text ?? response?.message?.content ?? String(response);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid response");

  return JSON.parse(jsonMatch[0]);
}
