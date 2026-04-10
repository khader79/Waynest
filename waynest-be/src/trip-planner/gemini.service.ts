import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeneratedPlan } from './entities/trip-planner.entity';

export class GeminiQuotaExceededError extends Error {
  readonly detail?: string;

  constructor(detail?: string) {
    super('Gemini quota/rate-limit exceeded');
    this.name = 'GeminiQuotaExceededError';
    this.detail = detail;
  }
}

type PlacePriceEstimateInput = {
  destinationName: string;
  persons: number;
  places: Array<{
    id: string;
    name: string;
    type?: string;
    tags: string[];
    rating?: number;
    currency?: string;
    referencePrice?: number | undefined;
  }>;
};

export type PlacePriceEstimateResult = Record<
  string,
  { estimatedPrice: number; perPerson: boolean; confidence?: number }
>;

@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateTripPlan(context: any): Promise<IGeneratedPlan> {
    const models = Array.from(
      new Set([
        this.modelName,
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ]),
    );

    let lastError: any;

    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await model.generateContent(this.buildPrompt(context));

          const text = result.response.text();
          return this.parseResponse(text);
        } catch (err: any) {
          lastError = err;

          if (err?.status === 429) {
            this.logger.warn(
              `Quota/rate-limit on ${modelName}, trying next model...`,
            );
            break;
          }

          if (err?.status === 503 && attempt < 2) {
            this.logger.warn(`Model busy, retrying in 2s...`);
            await this.sleep(2000);
            continue;
          }

          break;
        }
      }
    }

    this.logger.error('AI failed completely');
    throw lastError;
  }

  private buildPrompt(context: any): string {
    return `
You are a strict travel planner.

Destination: ${context.destinationName}
Days: ${context.days}
Persons: ${context.persons}
Budget: ${context.budget}

Places:
${JSON.stringify(context.places)}

Events:
${JSON.stringify(context.events)}

STRICT RULES:
- Use ONLY provided placeId
- DO NOT invent places
- Use exact names and ids
- Respect opening hours exactly
- Use given prices only
- If no valid option → return null

TIPS RULES:
- Generate realistic local tips
- No generic advice
- No mention of AI

Return ONLY valid JSON in this format:
{
  "days": [...],
  "totalEstimatedCost": number,
  "tips": ["..."]
}
`;
  }

  private parseResponse(raw: string): IGeneratedPlan {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private buildPriceEstimatePrompt(input: PlacePriceEstimateInput): string {
    return `
You are a travel pricing assistant for ${input.destinationName}.

Task:
- For each place in the list, estimate a realistic local price in ILS.
- If the place is usually paid per person, set perPerson=true.
- Confidence must be between 0 and 1.
- Prefer conservative realistic estimates.

Travelers: ${input.persons}

Places:
${JSON.stringify(input.places, null, 2)}

Respond ONLY with valid JSON where each key is place id:
{
  "place-id": { "estimatedPrice": 45, "perPerson": true, "confidence": 0.78 }
}
`;
  }

  private parsePriceEstimateResponse(
    raw: string,
    places: PlacePriceEstimateInput['places'],
  ): PlacePriceEstimateResult {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as Record<string, any>;
      const out: PlacePriceEstimateResult = {};
      for (const p of places) {
        const row = parsed?.[p.id];
        if (!row || typeof row !== 'object') continue;
        const estimatedPrice = Math.max(0, Number(row.estimatedPrice) || 0);
        if (!Number.isFinite(estimatedPrice)) continue;
        const confidenceRaw = Number(row.confidence);
        const confidence = Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(1, confidenceRaw))
          : undefined;
        out[p.id] = {
          estimatedPrice,
          perPerson: Boolean(row.perPerson),
          confidence,
        };
      }
      return out;
    } catch {
      return {};
    }
  }

  async estimatePlacePrices(
    input: PlacePriceEstimateInput,
  ): Promise<PlacePriceEstimateResult> {
    const models = Array.from(
      new Set([
        this.modelName,
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ]),
    );
    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      try {
        const prompt = this.buildPriceEstimatePrompt(input);
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        return this.parsePriceEstimateResponse(raw, input.places);
      } catch (err: any) {
        this.logger.warn(
          `estimatePlacePrices failed on ${modelName}: ${err?.message ?? err}`,
        );
        if (err?.status === 429) {
          // Try next fallback model instead of failing fast.
          continue;
        }
      }
    }
    return {};
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const prompt = `Respond with exactly: {"status":"ok"}`;
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      if (raw.includes('"status":"ok"') || raw.toLowerCase().includes('ok')) {
        return { ok: true };
      }
      return { ok: false, detail: raw };
    } catch (err: any) {
      this.logger.error('healthCheck failed', err);
      return { ok: false, detail: String(err?.message ?? err) };
    }
  }
}
