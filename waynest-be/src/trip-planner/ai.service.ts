import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
} from './entities/trip-planner.entity';

type AiProviderName = 'gemini' | 'openrouter';

export type TripPlannerPlaceContext = {
  id: string;
  placeId?: string;
  name: string;
  type?: string;
  rating?: number | string;
  imageUrl?: string | null;
  tags: string[];
  price: number;
  currency: string;
  perPerson?: boolean;
  openingHours: Array<{
    day: number;
    open: string | null;
    close: string | null;
  }>;
};

export type TripPlannerEventContext = {
  id: string;
  ticketPrice?: number | string;
  price?: number | string;
  name: string;
  currency?: string;
  startDate: string | Date;
  endDate: string | Date;
  venue?: string;
  venueId?: string;
  imageUrl?: string | null;
};

export type TripPlannerContext = {
  cityId?: string;
  destinationName: string;
  days: number;
  budget: number;
  persons: number;
  budgetPerPersonPerDay: number;
  places: TripPlannerPlaceContext[];
  events: TripPlannerEventContext[];
};

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

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type TextGenerationOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export class AiServiceError extends Error {
  readonly provider?: AiProviderName;

  constructor(message: string, provider?: AiProviderName, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.provider = provider;
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AiProviderUnavailableError extends AiServiceError {}

export class AiProviderRequestError extends AiServiceError {}

export class AiQuotaExceededError extends AiServiceError {
  readonly detail: string;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    provider?: AiProviderName,
    retryAfterSeconds?: number,
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.detail = message;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AiResponseParseError extends AiServiceError {
  readonly rawSnippet: string;

  constructor(
    message: string,
    provider?: AiProviderName,
    rawSnippet = '',
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.rawSnippet = rawSnippet;
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiModelName: string;
  private readonly openRouterModels: string[];
  private readonly openRouterEndpoint: string;
  private readonly openRouterCooldownMs: number;
  private readonly openRouterTimeoutMs: number;
  private readonly openRouterRetryDelayMs: number;
  private readonly openRouterSiteUrl: string;
  private readonly openRouterAppName: string;
  private readonly geminiCooldownMs: number;
  private readonly geminiClient?: GoogleGenerativeAI;
  private readonly openRouterApiKey?: string;
  private geminiCooldownUntil = 0;
  private openRouterCooldownUntil = 0;

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.readConfig('GEMINI_API_KEY');
    this.geminiModelName =
      this.readConfig('GEMINI_MODEL') ?? 'gemini-2.5-flash';

    this.openRouterApiKey = this.readConfig('OPENROUTER_API_KEY');
    this.openRouterEndpoint =
      this.readConfig('OPENROUTER_ENDPOINT') ??
      'https://openrouter.ai/api/v1/chat/completions';

    const configuredOpenRouterModel = this.readConfig('OPENROUTER_MODEL');
    const configuredOpenRouterModels = this.parseCsvSetting(
      this.readConfig('OPENROUTER_MODELS'),
    );
    this.openRouterModels = [
      ...new Set(
        [
          configuredOpenRouterModel,
          ...configuredOpenRouterModels,
          'mistralai/mistral-7b-instruct',
          'meta-llama/llama-3.1-8b-instruct:free',
        ].filter((model): model is string => Boolean(model)),
      ),
    ];

    this.openRouterSiteUrl =
      this.readConfig('OPENROUTER_SITE_URL') ??
      this.readConfig('FRONTEND_URL') ??
      'http://localhost:5173';
    this.openRouterAppName =
      this.readConfig('OPENROUTER_APP_NAME') ?? 'Waynest';
    this.openRouterTimeoutMs =
      Number(this.readConfig('OPENROUTER_TIMEOUT_MS')) || 30_000;
    this.openRouterCooldownMs =
      Number(this.readConfig('OPENROUTER_COOLDOWN_MS')) || 60_000;
    const openRouterRetryDelayMsRaw = Number(
      this.readConfig('OPENROUTER_RETRY_DELAY_MS'),
    );
    this.openRouterRetryDelayMs =
      Number.isFinite(openRouterRetryDelayMsRaw) &&
      openRouterRetryDelayMsRaw >= 0
        ? openRouterRetryDelayMsRaw
        : 120;
    this.geminiCooldownMs =
      Number(this.readConfig('GEMINI_COOLDOWN_MS')) || 300_000;

    if (geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiApiKey);
    }

    if (!this.geminiClient && !this.openRouterApiKey) {
      this.logger.warn('No AI provider API keys configured');
    }
  }

  async generateTripPlan(context: TripPlannerContext): Promise<IGeneratedPlan> {
    const prompt = this.buildPrompt(context);
    const { value } = await this.runWithFallback(prompt, (raw) =>
      this.parseResponse(raw),
    );

    return value;
  }

  async estimatePlacePrices(
    input: PlacePriceEstimateInput,
  ): Promise<PlacePriceEstimateResult> {
    const prompt = this.buildPriceEstimatePrompt(input);
    try {
      const { value } = await this.runWithFallback(prompt, (raw) =>
        this.parsePriceEstimateResponse(raw, input.places),
      );

      return value;
    } catch (error) {
      this.logger.warn(
        `Price estimation failed, using heuristic fallback: ${this.describeError(error)}`,
      );
      return {};
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    const prompt = 'Respond with exactly: {"status":"ok"}';

    try {
      const { value } = await this.runWithFallback(prompt, (raw) =>
        this.parseHealthResponse(raw),
      );

      return { ok: value };
    } catch (error) {
      return { ok: false, detail: this.describeError(error) };
    }
  }

  async generateAssistantText(
    prompt: string,
    options?: Omit<TextGenerationOptions, 'jsonMode'>,
  ): Promise<string> {
    const { value } = await this.runTextWithFallback(prompt, {
      ...options,
      jsonMode: false,
    });
    return value.trim();
  }

  private async runWithFallback<T>(
    prompt: string,
    parser: (raw: string) => T,
  ): Promise<{ provider: AiProviderName; value: T }> {
    const startedAt = Date.now();
    let geminiError: unknown;

    if (this.canTryGemini()) {
      this.logger.log('Trying Gemini...');
      try {
        const raw = await this.requestGeminiText(prompt);
        const value = parser(raw);
        this.logger.log(`Gemini success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini failed → switching to OpenRouter');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini');
    } else {
      this.logger.log('Gemini unavailable; switching to OpenRouter');
    }

    if (!this.openRouterApiKey || this.isOpenRouterCoolingDown()) {
      this.logger.error('All providers failed');
      if (geminiError instanceof Error) {
        throw geminiError;
      }

      if (!this.openRouterApiKey) {
        throw new AiProviderUnavailableError(
          'OpenRouter API key is not configured',
          'openrouter',
          geminiError,
        );
      }

      throw new AiQuotaExceededError(
        'OpenRouter is temporarily rate-limited',
        'openrouter',
        Math.max(1, Math.ceil(this.getOpenRouterCooldownRemainingMs() / 1000)),
        geminiError,
      );
    }

    try {
      const raw = await this.requestOpenRouterText(prompt);
      const value = parser(raw);
      this.logger.log(`OpenRouter success in ${Date.now() - startedAt}ms`);
      return { provider: 'openrouter', value };
    } catch (openRouterError) {
      this.logger.error('All providers failed');
      if (openRouterError instanceof Error) {
        throw openRouterError;
      }

      if (geminiError instanceof Error) {
        throw geminiError;
      }

      throw new AiProviderRequestError(
        'All providers failed',
        'openrouter',
        openRouterError,
      );
    }
  }

  private async runTextWithFallback(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<{ provider: AiProviderName; value: string }> {
    const startedAt = Date.now();
    let geminiError: unknown;

    if (this.canTryGemini()) {
      this.logger.log('Trying Gemini for text generation...');
      try {
        const value = await this.requestGeminiGeneratedText(prompt, options);
        this.logger.log(`Gemini text success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini text failed → switching to OpenRouter');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini text request');
    } else {
      this.logger.log('Gemini unavailable; switching to OpenRouter text');
    }

    if (!this.openRouterApiKey || this.isOpenRouterCoolingDown()) {
      this.logger.error('All text providers failed');
      if (geminiError instanceof Error) {
        throw geminiError;
      }

      if (!this.openRouterApiKey) {
        throw new AiProviderUnavailableError(
          'OpenRouter API key is not configured',
          'openrouter',
          geminiError,
        );
      }

      throw new AiQuotaExceededError(
        'OpenRouter is temporarily rate-limited',
        'openrouter',
        Math.max(1, Math.ceil(this.getOpenRouterCooldownRemainingMs() / 1000)),
        geminiError,
      );
    }

    try {
      const value = await this.requestOpenRouterText(prompt, options);
      this.logger.log(`OpenRouter text success in ${Date.now() - startedAt}ms`);
      return { provider: 'openrouter', value };
    } catch (openRouterError) {
      this.logger.error('All text providers failed');
      if (openRouterError instanceof Error) {
        throw openRouterError;
      }

      if (geminiError instanceof Error) {
        throw geminiError;
      }

      throw new AiProviderRequestError(
        'All text providers failed',
        'openrouter',
        openRouterError,
      );
    }
  }

  private async requestGeminiText(prompt: string): Promise<string> {
    return this.requestGeminiGeneratedText(prompt, {
      jsonMode: true,
      temperature: 0.3,
    });
  }

  private async requestGeminiGeneratedText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.geminiClient) {
      throw new AiProviderUnavailableError(
        'Gemini API key is not configured',
        'gemini',
      );
    }

    if (this.isGeminiCoolingDown()) {
      throw new AiQuotaExceededError(
        'Gemini is temporarily rate-limited',
        'gemini',
        Math.ceil(this.getGeminiCooldownRemainingMs() / 1000),
      );
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.geminiModelName,
      generationConfig: {
        ...(options?.jsonMode ? { responseMimeType: 'application/json' } : {}),
        temperature: this.normalizeTemperature(
          options?.temperature,
          options?.jsonMode ? 0.3 : 0.55,
        ),
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();

      if (!raw || !raw.trim()) {
        throw new AiProviderRequestError(
          'Gemini returned an empty response',
          'gemini',
        );
      }

      return raw;
    } catch (error) {
      throw this.normalizeGeminiFailure(error);
    }
  }

  private async requestOpenRouterText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new AiProviderUnavailableError(
        'OpenRouter API key is not configured',
        'openrouter',
      );
    }

    if (this.isOpenRouterCoolingDown()) {
      throw new AiQuotaExceededError(
        'OpenRouter is temporarily rate-limited',
        'openrouter',
        Math.max(1, Math.ceil(this.getOpenRouterCooldownRemainingMs() / 1000)),
      );
    }

    const modelsToTry =
      this.openRouterModels.length > 0
        ? this.openRouterModels
        : ['mistralai/mistral-7b-instruct'];

    const headers = {
      Authorization: `Bearer ${this.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.openRouterSiteUrl,
      'X-Title': this.openRouterAppName,
    };

    let lastError: unknown;

    for (const modelName of modelsToTry) {
      const payload = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.normalizeTemperature(options?.temperature, 0.4),
        max_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await axios.post<OpenRouterChatCompletionResponse>(
            this.openRouterEndpoint,
            payload,
            {
              headers,
              timeout: this.openRouterTimeoutMs,
            },
          );

          const raw = this.extractOpenRouterContent(response.data);
          if (!raw || !raw.trim()) {
            throw new AiProviderRequestError(
              `OpenRouter returned an empty response for model ${modelName}`,
              'openrouter',
            );
          }

          return raw;
        } catch (error) {
          if (this.isQuotaError(error)) {
            this.registerOpenRouterCooldown(error);
            throw this.normalizeOpenRouterFailure(error, modelName);
          }

          if (this.shouldTryNextOpenRouterModel(error)) {
            const status = this.getErrorStatus(error);
            this.logger.warn(
              `OpenRouter model ${modelName} failed with status ${status ?? 'unknown'}; trying next model`,
            );
            lastError = error;
            break;
          }

          if (this.isRetryableOpenRouterError(error) && attempt < 2) {
            this.logger.warn(
              `OpenRouter model ${modelName} overloaded or network error, retrying once in ${this.openRouterRetryDelayMs}ms`,
            );
            if (this.openRouterRetryDelayMs > 0) {
              await this.sleep(this.openRouterRetryDelayMs);
            }
            continue;
          }

          throw this.normalizeOpenRouterFailure(error, modelName);
        }
      }
    }

    throw this.normalizeOpenRouterFailure(
      lastError ??
        new Error('OpenRouter request failed for all configured models'),
      modelsToTry[modelsToTry.length - 1],
    );
  }

  private parseResponse(raw: string): IGeneratedPlan {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');
    let parsed: unknown;

    try {
      parsed = JSON.parse(candidate);
    } catch (error) {
      throw new AiResponseParseError(
        'Trip plan response is not valid JSON',
        undefined,
        this.summarize(raw),
        error,
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new AiResponseParseError(
        'Trip plan response must be a JSON object',
        undefined,
        this.summarize(raw),
      );
    }

    const payload = parsed as Record<string, unknown>;
    const days = Array.isArray(payload.days) ? payload.days : null;
    const tips = Array.isArray(payload.tips) ? payload.tips : null;

    if (!days || !tips) {
      throw new AiResponseParseError(
        'Trip plan JSON is missing required fields',
        undefined,
        this.summarize(raw),
      );
    }

    const normalizedDays = days.map((day, index) =>
      this.normalizeDay(day, index),
    );
    const fallbackTotal = this.sumPlanCost(normalizedDays);
    const totalEstimatedCost = this.normalizeNumber(
      payload.totalEstimatedCost,
      fallbackTotal,
    );
    const normalizedTips = tips
      .filter((tip): tip is string => typeof tip === 'string')
      .map((tip) => tip.trim())
      .filter((tip) => tip.length > 0);

    return {
      days: normalizedDays,
      totalEstimatedCost,
      tips: normalizedTips,
    };
  }

  private parsePriceEstimateResponse(
    raw: string,
    places: PlacePriceEstimateInput['places'],
  ): PlacePriceEstimateResult {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');

    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const out: PlacePriceEstimateResult = {};

      for (const place of places) {
        const row = parsed?.[place.id];
        if (!row || typeof row !== 'object') continue;

        const estimatedPrice = Math.max(
          0,
          Number((row as any).estimatedPrice) || 0,
        );
        if (!Number.isFinite(estimatedPrice)) continue;

        const confidenceRaw = Number((row as any).confidence);
        const confidence = Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(1, confidenceRaw))
          : undefined;

        out[place.id] = {
          estimatedPrice,
          perPerson: Boolean((row as any).perPerson),
          confidence,
        };
      }

      return out;
    } catch (error) {
      throw new AiResponseParseError(
        'Price estimate response is not valid JSON',
        undefined,
        this.summarize(raw),
        error,
      );
    }
  }

  private parseHealthResponse(raw: string): boolean {
    const candidate = this.extractJsonCandidate(raw, 'gemini/openrouter');

    try {
      const parsed = JSON.parse(candidate) as { status?: unknown };
      if (
        String(parsed?.status ?? '')
          .trim()
          .toLowerCase() === 'ok'
      ) {
        return true;
      }
    } catch {
      // Fall through to text checks below.
    }

    const normalized = raw.trim().toLowerCase();
    if (
      normalized === 'ok' ||
      normalized.includes('"status":"ok"') ||
      normalized.includes('{"status":"ok"}')
    ) {
      return true;
    }

    throw new AiResponseParseError(
      'Health check response is not valid JSON',
      undefined,
      this.summarize(raw),
    );
  }

  private normalizeDay(day: unknown, index: number): ITripDay {
    if (!day || typeof day !== 'object' || Array.isArray(day)) {
      throw new AiResponseParseError(
        'Trip plan day must be a JSON object',
        undefined,
        this.summarize(day),
      );
    }

    const row = day as Record<string, unknown>;
    const morning = this.normalizeSlot(row.morning);
    const afternoon = this.normalizeSlot(row.afternoon);
    const evening = this.normalizeSlot(row.evening);
    const fallbackTotal = this.sumSlots([morning, afternoon, evening]);

    return {
      day: this.normalizeNumber(row.day, index + 1),
      morning,
      afternoon,
      evening,
      totalDayCost: this.normalizeNumber(row.totalDayCost, fallbackTotal),
    };
  }

  private normalizeSlot(slot: unknown): ITripSlot | null {
    if (slot === null || slot === undefined) {
      return null;
    }

    if (typeof slot !== 'object' || Array.isArray(slot)) {
      return null;
    }

    return slot as ITripSlot;
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private normalizeTemperature(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.max(0, Math.min(1.5, numeric));
  }

  private normalizeMaxTokens(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }
    return Math.max(64, Math.min(8_192, Math.round(numeric)));
  }

  private canTryGemini(): boolean {
    return Boolean(this.geminiClient) && !this.isGeminiCoolingDown();
  }

  private sumSlots(slots: Array<ITripSlot | null>): number {
    return slots.reduce((sum, slot) => {
      const estimatedCost = Number((slot as any)?.estimatedCost ?? 0) || 0;
      return sum + estimatedCost;
    }, 0);
  }

  private sumPlanCost(days: ITripDay[]): number {
    return days.reduce(
      (sum, day) =>
        sum + this.sumSlots([day.morning, day.afternoon, day.evening]),
      0,
    );
  }

  private buildPrompt(context: TripPlannerContext): string {
    const budgetPerPersonPerDay = this.normalizeNumber(
      context.budgetPerPersonPerDay,
      Math.round(
        this.normalizeNumber(context.budget, 0) /
          Math.max(1, this.normalizeNumber(context.persons, 1)) /
          Math.max(1, this.normalizeNumber(context.days, 1)),
      ),
    );

    return `
You are a STRICT travel planning engine.

You MUST follow all rules exactly. Any violation is not allowed.

========================
CONTEXT
========================

Destination: ${context.destinationName}
Days: ${context.days}
Persons: ${context.persons}
Total Budget: ${context.budget}
Budget per person per day: ${budgetPerPersonPerDay}

Available Places (ONLY source of truth):
${JSON.stringify(context.places, null, 2)}

Available Events (ONLY source of truth):
${JSON.stringify(context.events, null, 2)}

========================
CRITICAL RULES (MANDATORY)
========================

1. You MUST ONLY use places from the provided list.
2. You MUST use EXACT placeId and name as given.
3. DO NOT invent, rename, or modify any place.
4. If no valid place exists -> return null for that slot.
5. Do NOT imply that the provided places represent the full destination inventory.

6. Respect opening hours:
   - Do NOT place a location outside its opening time.
   - If opening hours are missing, assume flexible.

7. Pricing:
   - Use ONLY the given price.
   - If perPerson = true -> multiply by number of persons.
   - Otherwise use price as-is.

8. Budget:
   - Try to stay within total budget.
   - Prefer realistic balance over maximum usage.

9. Variety:
   - Do NOT repeat the same place across multiple days unless necessary.

10. Events:
   - Use events ONLY if they match the day range.
   - Event cost = ticketPrice * persons.

11. Output MUST be 100% valid JSON.
    - NO markdown
    - NO explanations
    - NO extra text

========================
TRIP STRUCTURE
========================

Each day MUST include:
- morning
- afternoon
- evening

Each slot:
{
  "placeId": "string",
  "name": "string",
  "type": "string",
  "duration": "2-3 hours",
  "estimatedCost": number,
  "openTime": "HH:mm",
  "closeTime": "HH:mm"
}

OR null if no valid option.

========================
TIPS RULES (IMPORTANT)
========================

Generate HIGH-QUALITY travel tips:

- MUST be specific to the destination
- MUST be practical and realistic
- MUST NOT be generic (no "wear comfortable shoes")
- MUST NOT mention AI or system limitations
- MUST reflect local behavior, timing, or logistics
- If place/event data is sparse, keep tips tied to the listed places/events or broad logistics without acting like the itinerary covers the whole city.

Examples of GOOD tips:
- "Visit early morning to avoid tourist crowds near main landmarks"
- "Parking in old city areas is limited, consider walking"

Examples of BAD tips:
- "Enjoy your trip"
- "Stay hydrated"

========================
OUTPUT FORMAT
========================

Return ONLY this JSON:

{
  "days": [
    {
      "day": 1,
      "morning": {...} | null,
      "afternoon": {...} | null,
      "evening": {...} | null,
      "totalDayCost": number
    }
  ],
  "totalEstimatedCost": number,
  "tips": ["string", "string"]
}
`;
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

  private extractJsonCandidate(raw: string, provider: string): string {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!cleaned) {
      throw new AiResponseParseError(
        'AI provider returned an empty response',
        undefined,
        '',
      );
    }

    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (error) {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');

      if (objectStart >= 0 && objectEnd > objectStart) {
        const candidate = cleaned.slice(objectStart, objectEnd + 1).trim();
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          throw new AiResponseParseError(
            `${provider} response is not valid JSON`,
            undefined,
            this.summarize(raw),
            error,
          );
        }
      }

      throw new AiResponseParseError(
        `${provider} response is not valid JSON`,
        undefined,
        this.summarize(raw),
        error,
      );
    }
  }

  private extractOpenRouterContent(
    data: OpenRouterChatCompletionResponse,
  ): string {
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => this.flattenMessageContentPart(part))
        .join('');
    }

    return this.flattenMessageContentPart(content);
  }

  private flattenMessageContentPart(part: unknown): string {
    if (typeof part === 'string') {
      return part;
    }

    if (!part || typeof part !== 'object') {
      return '';
    }

    const candidate =
      (part as Record<string, unknown>).text ??
      (part as Record<string, unknown>).content ??
      '';

    return typeof candidate === 'string' ? candidate : String(candidate);
  }

  private wrapTripPlanFailure(lastError: unknown): Error {
    if (lastError instanceof AiServiceError) {
      return lastError;
    }

    return new AiProviderRequestError(
      `Trip plan generation failed: ${this.describeError(lastError)}`,
      undefined,
      lastError,
    );
  }

  private wrapProviderError(
    provider: AiProviderName,
    error: unknown,
    fallbackMessage: string,
  ): AiProviderRequestError {
    if (error instanceof AiServiceError) {
      return error;
    }

    return new AiProviderRequestError(
      `${fallbackMessage}: ${this.describeError(error)}`,
      provider,
      error,
    );
  }

  private providerLabel(provider: AiProviderName): string {
    return provider === 'gemini' ? 'Gemini' : 'OpenRouter';
  }

  private providerSuffix(provider: AiProviderName): string {
    if (provider === 'gemini') {
      return ` (${this.geminiModelName})`;
    }

    return ` (${this.openRouterModels[0] ?? 'openrouter'})`;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'unknown error';
    }
  }

  private summarize(value: unknown): string {
    if (typeof value === 'string') {
      return value.slice(0, 500);
    }

    try {
      return JSON.stringify(value).slice(0, 500);
    } catch {
      return '';
    }
  }

  private readConfig(key: string): string | undefined {
    const value = this.configService.get<string>(key);
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private parseCsvSetting(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private normalizeGeminiFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);

    if (status === 429 || status === 503) {
      this.registerGeminiCooldown(error);
      return new AiQuotaExceededError(
        `Gemini temporarily unavailable (${status})`,
        'gemini',
        Math.max(1, Math.ceil(this.getGeminiCooldownRemainingMs() / 1000)),
        error,
      );
    }

    if (this.isNetworkError(error)) {
      return new AiProviderRequestError(
        `Gemini network error: ${this.describeError(error)}`,
        'gemini',
        error,
      );
    }

    return new AiProviderRequestError(
      `Gemini request failed: ${this.describeError(error)}`,
      'gemini',
      error,
    );
  }

  private normalizeOpenRouterFailure(
    error: unknown,
    modelName?: string,
  ): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);
    const responseData = this.getErrorResponseData(error);
    const detail = responseData
      ? this.describeError(responseData)
      : this.describeError(error);
    const statusSuffix = status ? ` (${status})` : '';
    const modelSuffix = modelName ? ` [model=${modelName}]` : '';

    if (status === 429) {
      const retryAfterMs =
        this.extractRetryAfterMs(error) ?? this.getOpenRouterCooldownRemainingMs();
      return new AiQuotaExceededError(
        `OpenRouter request rate-limited${modelSuffix}: ${detail}`,
        'openrouter',
        Math.max(1, Math.ceil(Math.max(1, retryAfterMs) / 1000)),
        error,
      );
    }

    if (status === 503) {
      return new AiProviderUnavailableError(
        `OpenRouter temporarily unavailable${statusSuffix}${modelSuffix}: ${detail}`,
        'openrouter',
        error,
      );
    }

    return new AiProviderRequestError(
      `OpenRouter request failed${statusSuffix}${modelSuffix}: ${detail}`,
      'openrouter',
      error,
    );
  }

  private shouldTryNextOpenRouterModel(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    return status === 400 || status === 404 || status === 422;
  }

  private isGeminiCoolingDown(): boolean {
    return this.geminiCooldownUntil > Date.now();
  }

  private getGeminiCooldownRemainingMs(): number {
    return Math.max(0, this.geminiCooldownUntil - Date.now());
  }

  private isOpenRouterCoolingDown(): boolean {
    return this.openRouterCooldownUntil > Date.now();
  }

  private getOpenRouterCooldownRemainingMs(): number {
    return Math.max(0, this.openRouterCooldownUntil - Date.now());
  }

  private registerGeminiCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.geminiCooldownMs, retryAfterMs ?? 0);
    this.geminiCooldownUntil = Math.max(
      this.geminiCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `Gemini quota exceeded; pausing Gemini requests for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private registerOpenRouterCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.openRouterCooldownMs, retryAfterMs ?? 0);
    this.openRouterCooldownUntil = Math.max(
      this.openRouterCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `OpenRouter quota exceeded; pausing OpenRouter requests for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private extractRetryAfterMs(error: unknown): number | undefined {
    const headers = this.getResponseHeaders(error);
    const retryAfterHeader =
      headers['retry-after'] ?? headers['Retry-After'] ?? headers['retryAfter'];

    if (typeof retryAfterHeader === 'string' && retryAfterHeader.trim()) {
      const seconds = Number(retryAfterHeader);
      if (Number.isFinite(seconds)) {
        return Math.max(0, Math.round(seconds * 1000));
      }

      const date = new Date(retryAfterHeader);
      if (!Number.isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
      }
    }

    const message = this.describeError(error);
    const match =
      message.match(/retryDelay":"(\d+(?:\.\d+)?)s"/i) ??
      message.match(/Please retry in ([\d.]+)s/i) ??
      message.match(/retry in ([\d.]+)s/i);

    if (!match) {
      return undefined;
    }

    const seconds = Number(match[1]);
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
  }

  private getResponseHeaders(error: unknown): Record<string, string> {
    if (!error || typeof error !== 'object') {
      return {};
    }

    const headers = (error as any)?.response?.headers;
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    return headers as Record<string, string>;
  }

  private getErrorResponseData(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    return (error as any)?.response?.data;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate =
      (error as any)?.status ?? (error as any)?.response?.status;
    const status = Number(candidate);
    return Number.isFinite(status) ? status : undefined;
  }

  private getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate = (error as any)?.code;
    return typeof candidate === 'string' ? candidate : undefined;
  }

  private isQuotaError(error: unknown): boolean {
    return this.getErrorStatus(error) === 429;
  }

  private isRetryableGeminiError(error: unknown): boolean {
    return this.getErrorStatus(error) === 503 || this.isNetworkError(error);
  }

  private isRetryableOpenRouterError(error: unknown): boolean {
    return this.getErrorStatus(error) === 503 || this.isNetworkError(error);
  }

  private isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = this.getErrorCode(error);
    const networkCodes = new Set([
      'ECONNABORTED',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ETIMEDOUT',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_SOCKET',
    ]);

    if (code && networkCodes.has(code)) {
      return true;
    }

    const message = this.describeError(error).toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up') ||
      message.includes('timed out')
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
