import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IGeneratedPlan,
  ITripDay,
  ITripSlot,
} from './entities/trip-planner.entity';

type AiProviderName = 'gemini' | 'groq' | 'openrouter' | 'huggingface';

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

export type PerDayWeather = {
  date: string;
  condition: string;
  tempC: number;
  isRainy: boolean;
  isHot: boolean;
  isCold: boolean;
};

export type TripDayContext = {
  dayNumber: number;
  date: string;
  dayOfWeek: number; // 0=Sunday … 6=Saturday
  dayName: string;   // "Monday", "Tuesday", etc.
  weather?: PerDayWeather;
  /** Place IDs that are closed on this day of week (from opening hours data) */
  closedPlaceIds?: string[];
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
  /** Traveler profile controlling itinerary style and priorities */
  travelerType?: string;
  /** Physical mobility constraint */
  mobilityLevel?: string;
  /** Age group mix (e.g. ['adults', 'children', 'seniors']) */
  ageGroups?: string[];
  /** User interests for scoring / priority boosting */
  interests?: string[];
  /** Per-day weather forecast for the trip dates */
  weatherForecast?: PerDayWeather[];
  /** Rich per-day context: day of week, weather, closed places */
  tripDays?: TripDayContext[];
  /** Currency code for the destination */
  currencyCode?: string;
  /** Trip quality score (0–100) calculated by the scoring engine */
  qualityScore?: number;
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

type GroqChatCompletionResponse = OpenRouterChatCompletionResponse;

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
  private readonly groqApiKey?: string;
  private readonly groqModel: string;
  /** Fast fallback model used when primary Groq model is rate-limited */
  private readonly groqFastModel: string;
  private readonly groqEndpoint: string;
  private readonly groqTimeoutMs: number;
  private readonly groqCooldownMs: number;
  private readonly groqRetryDelayMs: number;
  private readonly huggingFaceApiKey?: string;
  private readonly huggingFaceModel: string;
  private readonly huggingFaceEndpoint: string;
  private readonly huggingFaceTimeoutMs: number;
  private readonly huggingFaceCooldownMs: number;
  private readonly geminiCooldownMs: number;
  private readonly geminiClient?: GoogleGenerativeAI;
  private readonly openRouterApiKey?: string;
  private geminiCooldownUntil = 0;
  private groqCooldownUntil = 0;
  private openRouterCooldownUntil = 0;
  private huggingFaceCooldownUntil = 0;

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.readConfig('GEMINI_API_KEY');
    this.geminiModelName =
      this.readConfig('GEMINI_MODEL') ?? 'gemini-2.0-flash-lite';

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
          'openai/gpt-oss-120b:free',
          'qwen/qwen3-coder:free',
          'google/gemma-4-26b-a4b-it:free',
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

    this.groqApiKey = this.readConfig('GROQ_API_KEY');
    this.groqModel = this.readConfig('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';
    this.groqFastModel = this.readConfig('GROQ_FAST_MODEL') ?? 'llama-3.1-8b-instant';
    this.groqEndpoint =
      this.readConfig('GROQ_ENDPOINT') ??
      'https://api.groq.com/openai/v1/chat/completions';
    this.groqTimeoutMs = Number(this.readConfig('GROQ_TIMEOUT_MS')) || 30_000;
    this.groqCooldownMs = Number(this.readConfig('GROQ_COOLDOWN_MS')) || 60_000;
    const groqRetryDelayMsRaw = Number(this.readConfig('GROQ_RETRY_DELAY_MS'));
    this.groqRetryDelayMs =
      Number.isFinite(groqRetryDelayMsRaw) && groqRetryDelayMsRaw >= 0
        ? groqRetryDelayMsRaw
        : 120;

    this.huggingFaceApiKey = this.readConfig('HUGGINGFACE_API_KEY');
    this.huggingFaceModel =
      this.readConfig('HUGGINGFACE_MODEL') ??
      'mistralai/Mistral-7B-Instruct-v0.3';
    this.huggingFaceEndpoint =
      this.readConfig('HUGGINGFACE_ENDPOINT') ??
      'https://api-inference.huggingface.co/models';
    this.huggingFaceTimeoutMs =
      Number(this.readConfig('HUGGINGFACE_TIMEOUT_MS')) || 60_000;
    this.huggingFaceCooldownMs =
      Number(this.readConfig('HUGGINGFACE_COOLDOWN_MS')) || 60_000;

    if (geminiApiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiApiKey);
    }

    if (
      !this.geminiClient &&
      !this.groqApiKey &&
      !this.openRouterApiKey &&
      !this.huggingFaceApiKey
    ) {
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
    let groqError: unknown;
    let openRouterError: unknown;

    if (this.canTryGroq()) {
      this.logger.log('Trying Groq...');
      try {
        const raw = await this.requestGroqText(prompt);
        const value = parser(raw);
        this.logger.log(`Groq success in ${Date.now() - startedAt}ms`);
        return { provider: 'groq', value };
      } catch (error) {
        groqError = error;
        this.logger.warn('Groq failed → switching to OpenRouter');
      }
    } else if (this.groqApiKey) {
      this.logger.log('Groq cooldown active; skipping Groq');
    } else {
      this.logger.log('Groq unavailable; switching to OpenRouter');
    }

    if (this.canTryOpenRouter()) {
      try {
        const raw = await this.requestOpenRouterText(prompt);
        const value = parser(raw);
        this.logger.log(`OpenRouter success in ${Date.now() - startedAt}ms`);
        return { provider: 'openrouter', value };
      } catch (error) {
        openRouterError = error;
        this.logger.warn('OpenRouter failed → switching to HuggingFace');
      }
    } else if (this.openRouterApiKey) {
      this.logger.log('OpenRouter cooldown active; skipping OpenRouter');
    } else {
      this.logger.log('OpenRouter unavailable; switching to HuggingFace');
    }

    if (this.canTryGemini()) {
      try {
        const raw = await this.requestGeminiText(prompt);
        const value = parser(raw);
        this.logger.log(`Gemini success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini failed → switching to HuggingFace');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini');
    } else {
      this.logger.log('Gemini unavailable; switching to HuggingFace');
    }

    if (this.canTryHuggingFace()) {
      try {
        const raw = await this.requestHuggingFaceText(prompt);
        const value = parser(raw);
        this.logger.log(`HuggingFace success in ${Date.now() - startedAt}ms`);
        return { provider: 'huggingface', value };
      } catch (huggingFaceError) {
        this.logger.error('All providers failed');
        if (huggingFaceError instanceof Error) {
          throw huggingFaceError;
        }
        if (openRouterError instanceof Error) {
          throw openRouterError;
        }
        if (groqError instanceof Error) {
          throw groqError;
        }
        if (geminiError instanceof Error) {
          throw geminiError;
        }
        throw new AiProviderRequestError(
          'All providers failed',
          'huggingface',
          huggingFaceError,
        );
      }
    }

    this.logger.error('All providers failed');
    if (openRouterError instanceof Error) {
      throw openRouterError;
    }
    if (groqError instanceof Error) {
      throw groqError;
    }
    if (geminiError instanceof Error) {
      throw geminiError;
    }
    throw new AiProviderUnavailableError(
      'No AI provider is available',
      'huggingface',
    );
  }

  private async runTextWithFallback(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<{ provider: AiProviderName; value: string }> {
    const startedAt = Date.now();
    let geminiError: unknown;
    let groqError: unknown;
    let openRouterError: unknown;

    if (this.canTryGroq()) {
      this.logger.log('Trying Groq for text generation...');
      try {
        const value = await this.requestGroqText(prompt, options);
        this.logger.log(`Groq text success in ${Date.now() - startedAt}ms`);
        return { provider: 'groq', value };
      } catch (error) {
        groqError = error;
        this.logger.warn('Groq text failed → switching to OpenRouter');
      }
    } else if (this.groqApiKey) {
      this.logger.log('Groq cooldown active; skipping Groq text');
    } else {
      this.logger.log('Groq unavailable; switching to OpenRouter text');
    }

    if (this.canTryOpenRouter()) {
      try {
        const value = await this.requestOpenRouterText(prompt, options);
        this.logger.log(
          `OpenRouter text success in ${Date.now() - startedAt}ms`,
        );
        return { provider: 'openrouter', value };
      } catch (error) {
        openRouterError = error;
        this.logger.warn('OpenRouter text failed → switching to HuggingFace');
      }
    } else if (this.openRouterApiKey) {
      this.logger.log('OpenRouter cooldown active; skipping OpenRouter text');
    } else {
      this.logger.log('OpenRouter unavailable; switching to HuggingFace text');
    }

    if (this.canTryGemini()) {
      try {
        const value = await this.requestGeminiGeneratedText(prompt, options);
        this.logger.log(`Gemini text success in ${Date.now() - startedAt}ms`);
        return { provider: 'gemini', value };
      } catch (error) {
        geminiError = error;
        this.logger.warn('Gemini text failed → switching to HuggingFace');
      }
    } else if (this.geminiClient) {
      this.logger.log('Gemini cooldown active; skipping Gemini text request');
    } else {
      this.logger.log('Gemini unavailable; switching to HuggingFace text');
    }

    if (this.canTryHuggingFace()) {
      try {
        const value = await this.requestHuggingFaceText(prompt, options);
        this.logger.log(
          `HuggingFace text success in ${Date.now() - startedAt}ms`,
        );
        return { provider: 'huggingface', value };
      } catch (huggingFaceError) {
        this.logger.error('All text providers failed');
        if (huggingFaceError instanceof Error) {
          throw huggingFaceError;
        }
        if (openRouterError instanceof Error) {
          throw openRouterError;
        }
        if (groqError instanceof Error) {
          throw groqError;
        }
        if (geminiError instanceof Error) {
          throw geminiError;
        }
        throw new AiProviderRequestError(
          'All text providers failed',
          'huggingface',
          huggingFaceError,
        );
      }
    }

    this.logger.error('All text providers failed');
    if (openRouterError instanceof Error) {
      throw openRouterError;
    }
    if (groqError instanceof Error) {
      throw groqError;
    }
    if (geminiError instanceof Error) {
      throw geminiError;
    }
    throw new AiProviderUnavailableError(
      'No AI provider is available for text generation',
      'huggingface',
    );
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

  private async requestGroqText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.groqApiKey) {
      throw new AiProviderUnavailableError(
        'Groq API key is not configured',
        'groq',
      );
    }

    if (this.isGroqCoolingDown()) {
      throw new AiQuotaExceededError(
        'Groq is temporarily rate-limited',
        'groq',
        Math.max(1, Math.ceil(this.getGroqCooldownRemainingMs() / 1000)),
      );
    }

    // Try primary model first, then fast fallback model on rate-limit/overload
    const modelsToTry = [this.groqModel, this.groqFastModel].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );

    let lastError: unknown;

    for (const modelName of modelsToTry) {
      const payload = {
        model: modelName,
        messages: [
          ...(options?.jsonMode
            ? [
                {
                  role: 'system',
                  content:
                    'Return valid JSON only. Do not include markdown or prose outside the JSON object.',
                },
              ]
            : []),
          { role: 'user', content: prompt },
        ],
        temperature: this.normalizeTemperature(options?.temperature, 0.35),
        max_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
        ...(options?.jsonMode
          ? { response_format: { type: 'json_object' } }
          : {}),
      };

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await axios.post<GroqChatCompletionResponse>(
            this.groqEndpoint,
            payload,
            {
              headers: {
                Authorization: `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: this.groqTimeoutMs,
            },
          );

          const raw = this.extractOpenRouterContent(response.data);
          if (!raw || !raw.trim()) {
            throw new AiProviderRequestError(
              `Groq returned an empty response for model ${modelName}`,
              'groq',
            );
          }

          if (modelName !== this.groqModel) {
            this.logger.log(`Groq fast-fallback model ${modelName} succeeded`);
          }
          return raw;
        } catch (error) {
          if (this.isQuotaError(error)) {
            this.registerGroqCooldown(error);
            // On 429, try the fast model before giving up entirely
            this.logger.warn(
              `Groq ${modelName} rate-limited (429); trying next model`,
            );
            lastError = error;
            break; // try next model
          }

          if (this.isRetryableGroqError(error) && attempt < 2) {
            this.logger.warn(
              `Groq ${modelName} overloaded, retrying in ${this.groqRetryDelayMs}ms`,
            );
            if (this.groqRetryDelayMs > 0) {
              await this.sleep(this.groqRetryDelayMs);
            }
            continue;
          }

          lastError = error;
          // Non-retryable error on this model → try next model
          const status = this.getErrorStatus(error);
          if (status === 400 || status === 404 || status === 422) {
            this.logger.warn(`Groq model ${modelName} rejected (${status}); trying next`);
            break;
          }

          throw this.normalizeGroqFailure(error);
        }
      }
    }

    throw this.normalizeGroqFailure(
      lastError ?? new Error('All Groq models failed'),
    );
  }

  private async requestHuggingFaceText(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<string> {
    if (!this.huggingFaceApiKey) {
      throw new AiProviderUnavailableError(
        'HuggingFace API key is not configured',
        'huggingface',
      );
    }

    if (this.isHuggingFaceCoolingDown()) {
      throw new AiQuotaExceededError(
        'HuggingFace is temporarily rate-limited',
        'huggingface',
        Math.max(1, Math.ceil(this.getHuggingFaceCooldownRemainingMs() / 1000)),
      );
    }

    const modelEndpoint = `${this.huggingFaceEndpoint}/${this.huggingFaceModel}`;

    const payload: Record<string, unknown> = {
      inputs: prompt,
      parameters: {
        temperature: this.normalizeTemperature(options?.temperature, 0.4),
        max_new_tokens: this.normalizeMaxTokens(options?.maxTokens, 4_096),
        return_full_text: false,
      },
    };

    if (options?.jsonMode) {
      payload.parameters = {
        ...(payload.parameters as Record<string, unknown>),
        return_full_text: false,
      };
    }

    try {
      const response = await axios.post<unknown>(modelEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.huggingFaceTimeoutMs,
      });

      const data = response.data;
      return this.extractHuggingFaceResponse(data);
    } catch (error) {
      throw this.normalizeHuggingFaceFailure(error);
    }
  }

  private extractHuggingFaceResponse(data: unknown): string {
    if (Array.isArray(data)) {
      const items = data as Array<Record<string, unknown>>;
      const texts = items
        .map((item) => item?.generated_text)
        .filter((t): t is string => typeof t === 'string');
      if (texts.length > 0) {
        return texts.join('\n');
      }
    }

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.generated_text === 'string') {
        return obj.generated_text;
      }
      if (typeof obj.error === 'string') {
        throw new AiProviderRequestError(
          `HuggingFace API error: ${obj.error}`,
          'huggingface',
        );
      }
    }

    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data);
    } catch {
      throw new AiProviderRequestError(
        'HuggingFace returned an unparseable response',
        'huggingface',
      );
    }
  }

  private canTryOpenRouter(): boolean {
    return Boolean(this.openRouterApiKey) && !this.isOpenRouterCoolingDown();
  }

  private canTryGroq(): boolean {
    return Boolean(this.groqApiKey) && !this.isGroqCoolingDown();
  }

  private canTryHuggingFace(): boolean {
    return Boolean(this.huggingFaceApiKey) && !this.isHuggingFaceCoolingDown();
  }

  private isHuggingFaceCoolingDown(): boolean {
    return this.huggingFaceCooldownUntil > Date.now();
  }

  private getHuggingFaceCooldownRemainingMs(): number {
    return Math.max(0, this.huggingFaceCooldownUntil - Date.now());
  }

  private registerHuggingFaceCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.huggingFaceCooldownMs, retryAfterMs ?? 0);
    this.huggingFaceCooldownUntil = Math.max(
      this.huggingFaceCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `HuggingFace quota exceeded; pausing for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  private normalizeHuggingFaceFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);

    if (status === 429 || status === 503) {
      this.registerHuggingFaceCooldown(error);
      const responseData = this.getErrorResponseData(error);
      const detail = responseData
        ? this.describeError(responseData)
        : this.describeError(error);
      return new AiQuotaExceededError(
        `HuggingFace temporarily unavailable (${status}): ${detail}`,
        'huggingface',
        Math.max(1, Math.ceil(this.getHuggingFaceCooldownRemainingMs() / 1000)),
        error,
      );
    }

    if (this.isModelLoadingError(error)) {
      const retryAfterMs = this.extractRetryAfterMs(error) ?? 20_000;
      this.huggingFaceCooldownUntil = Math.max(
        this.huggingFaceCooldownUntil,
        Date.now() + retryAfterMs,
      );
      return new AiQuotaExceededError(
        `HuggingFace model is loading, retry in ${Math.ceil(retryAfterMs / 1000)}s`,
        'huggingface',
        Math.max(1, Math.ceil(retryAfterMs / 1000)),
        error,
      );
    }

    if (this.isNetworkError(error)) {
      return new AiProviderRequestError(
        `HuggingFace network error: ${this.describeError(error)}`,
        'huggingface',
        error,
      );
    }

    const detail = this.describeError(error);
    const responseData = this.getErrorResponseData(error);
    const responseDetail = responseData
      ? `: ${this.describeError(responseData)}`
      : '';

    return new AiProviderRequestError(
      `HuggingFace request failed${responseDetail}: ${detail}`,
      'huggingface',
      error,
    );
  }

  private isModelLoadingError(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    if (status !== 503) return false;

    const data = this.getErrorResponseData(error);
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.error === 'string' && obj.error.includes('loading')) {
        const estimated = obj.estimated_time;
        if (typeof estimated === 'number') {
          this.huggingFaceCooldownUntil = Math.max(
            this.huggingFaceCooldownUntil,
            Date.now() + Math.round(estimated * 1000),
          );
        }
        return true;
      }
    }

    return false;
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

  buildPrompt(context: TripPlannerContext): string {
    const budgetPerPersonPerDay = this.normalizeNumber(
      context.budgetPerPersonPerDay,
      Math.round(
        this.normalizeNumber(context.budget, 0) /
          Math.max(1, this.normalizeNumber(context.persons, 1)) /
          Math.max(1, this.normalizeNumber(context.days, 1)),
      ),
    );

    const profileSection = this.buildTravelerProfileSection(
      context.travelerType,
      context.mobilityLevel,
      context.ageGroups,
      context.persons,
    );

    const weatherSection = this.buildWeatherSection(context.weatherForecast);
    const budgetSection = this.buildBudgetGuidanceSection(
      context.budget,
      context.persons,
      context.days,
      context.travelerType,
      context.currencyCode,
    );

    const interestLine = context.interests?.length
      ? `User Interests: ${context.interests.join(', ')} — PRIORITIZE places matching these interests.`
      : '';

    const dayScheduleSection = this.buildDayScheduleSection(context.tripDays, context.weatherForecast);

    return `You are a STRICT, INTELLIGENT travel planning engine acting as a professional travel advisor.

CRITICAL: Every field you output will be validated against the ground-truth database. Hallucinations (wrong names, wrong prices) will be OVERWRITTEN. Output ONLY what the data supports.

════════════════════════════════════════
TRIP CONTEXT
════════════════════════════════════════

Destination: ${context.destinationName}
Trip Duration: ${context.days} day(s)
Travelers: ${context.persons} person(s)
Total Budget: ${context.budget} ${context.currencyCode ?? 'ILS'}
Budget per person per day: ${budgetPerPersonPerDay} ${context.currencyCode ?? 'ILS'}
${interestLine}

════════════════════════════════════════
TRAVELER PROFILE — READ THIS FIRST
════════════════════════════════════════

${profileSection}

════════════════════════════════════════
DAY-BY-DAY SCHEDULE CONTEXT
════════════════════════════════════════

${dayScheduleSection}

════════════════════════════════════════
WEATHER INTELLIGENCE
════════════════════════════════════════

${weatherSection}

════════════════════════════════════════
BUDGET INTELLIGENCE
════════════════════════════════════════

${budgetSection}

════════════════════════════════════════
AVAILABLE PLACES (ground-truth — ONLY source)
════════════════════════════════════════

Each place has a "score" field (0–100) = relevance to this traveler (rating + interest match + weather + budget).
PLACES ARE SORTED BY SCORE DESCENDING. Use the top-scored ones first.

${this.formatPlacesForPrompt(context.places, context.tripDays)}

════════════════════════════════════════
AVAILABLE EVENTS (ground-truth — ONLY source)
════════════════════════════════════════

${context.events.length > 0 ? JSON.stringify(context.events, null, 2) : 'No events available for this trip window.'}

════════════════════════════════════════
MANDATORY RULES (ZERO TOLERANCE)
════════════════════════════════════════

PLACES:
1. USE ONLY provided places — NEVER invent places, names, or attractions.
2. Use EXACT placeId, EXACT name, EXACT type from the list. Never modify.
3. RELIGIOUS PLACES (tag "religious") → estimatedCost = 0 always.
4. Empty slot → null. Never fabricate a substitute.

PRICING (STRICT):
5. estimatedCost = price * persons if perPerson=true, else price as-is.
6. NEVER invent or modify prices. Trust only the "price" field.

BUDGET DISCIPLINE:
7. Total estimated costs MUST NOT exceed the total budget.
8. Distribute spending evenly across days — never exhaust budget on day 1.
9. If budget is tight: choose free/cheap places, avoid expensive slots.
10. If budget is generous: choose higher-scored, higher-rated places.

VARIETY & QUALITY:
11. NEVER repeat the same place across different days.
12. Each day MUST follow this strict time-of-day logic:
    - MORNING:   landmarks, museums, religious sites, heritage, monuments, viewpoints, gardens
    - AFTERNOON: activities, tours, markets, shopping, parks, beaches, attractions
    - EVENING:   restaurants, cafes, bars, lounges, bakeries, dining venues
    A RESTAURANT must NEVER appear in the morning slot. A LANDMARK must NEVER appear in the evening slot.
13. Balance indoor and outdoor based on weather signals.
14. Match place types to traveler profile (see TRAVELER PROFILE section).
15. TIPS must NEVER contradict the actual schedule. If a place is scheduled in the EVENING, never write a tip saying to visit it in the morning. Tips must exactly match the slot where the place was placed.

EVENTS:
15. Only include events whose date overlaps the trip window.
16. Event cost = ticketPrice * persons.

OPENING HOURS & DAY-OF-WEEK (CRITICAL):
17. Each day has a specific day of week listed above (Monday, Friday, etc.).
18. The openingHours array lists which days (0=Sun,1=Mon,...6=Sat) a place is open.
19. NEVER schedule a place on a day it is closed. Check: does the place have an opening hours entry for this day of week?
20. If openingHours is empty → assume open every day.
21. Respect the open/close time window. Do not place a place outside its hours.

WEATHER ADAPTATION:
22. On rainy days → PREFER indoor places (museums, cafes, galleries, restaurants).
23. On hot days → PREFER shade/indoor during afternoon; outdoor in morning/evening.
24. On perfect weather → maximize outdoor scenic experiences.

OUTPUT:
25. Return ONLY valid JSON. NO markdown. NO explanation. NO extra text.

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════

{
  "days": [
    {
      "day": 1,
      "morning": {
        "placeId": "exact-id-from-list",
        "name": "exact-name-from-list",
        "type": "exact-type-from-list",
        "duration": "2-3 hours",
        "estimatedCost": 0,
        "openTime": "09:00",
        "closeTime": "17:00"
      },
      "afternoon": {...} | null,
      "evening": {...} | null,
      "totalDayCost": 0
    }
  ],
  "totalEstimatedCost": 0,
  "tips": [
    "Specific, actionable tip tied to a real place or local reality — NOT generic advice",
    "Another destination-specific tip"
  ]
}

TIPS RULES (CRITICAL — read every word):

Generate exactly 4–5 tips. Each tip MUST:
1. Name a specific place from the itinerary AND give a specific, actionable insight.
2. Reference REAL local knowledge: opening times, crowd patterns, best entry points, transport, local etiquette, cost-saving tricks, booking requirements.
3. NEVER say anything that contradicts the schedule (if Church of Nativity is in MORNING, tip must say "morning" not "afternoon").
4. Be 1–2 sentences. No filler. No padding.

WHAT MAKES A GREAT TIP (use these as templates):
✅ "Church of the Nativity opens at 08:00 — arrive by 08:15 before tour groups arrive around 09:30; the Grotto of the Nativity queue is shortest before 09:00."
✅ "Manger Square is free to walk through any time — park outside the square on Star Street to avoid the narrow entrance."
✅ "Afteem Restaurant doesn't take reservations; arrive before 13:00 for lunch or after 20:00 for dinner to avoid a 20–30 min wait."
✅ "Day 2 has rain forecast — Bethlehem Museum (indoor) is a perfect afternoon activity; the gift shop inside sells locally-made olive wood carvings at fixed prices."
✅ "Solomon's Pools is least crowded on weekday mornings; the site has no entry fee but a donation box is at the main gate."

WHAT TO NEVER WRITE:
❌ "Enjoy your trip" / "Have a great time" / "Make memories"
❌ "Stay hydrated" / "Wear comfortable shoes" / "Bring sunscreen"
❌ "Check local guidelines" / "Be respectful" / "Be aware of your surroundings"
❌ Any tip that mentions visiting a place at a time different from when it's scheduled
❌ Any generic travel advice not specific to this destination and these exact places
`;
  }

  /**
   * Compact, token-efficient place list for the AI prompt.
   * Strips imageUrl/placeId duplicates, compresses openingHours to just
   * what the AI needs, and annotates closed-day warnings per place.
   */
  private formatPlacesForPrompt(
    places: TripPlannerPlaceContext[],
    tripDays?: TripDayContext[],
  ): string {
    if (!places?.length) return 'No places available.';

    const tripDowSet = tripDays
      ? new Set(tripDays.map((d) => d.dayOfWeek))
      : null;

    return places.map((p) => {
      // Find open hours relevant to the trip's days of week
      const relevantHours = p.openingHours?.filter(
        (h) => !tripDowSet || tripDowSet.has(h.day),
      ) ?? [];

      const hoursStr = relevantHours.length > 0
        ? relevantHours
            .map((h) => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.day] ?? h.day}: ${h.open ?? '?'}–${h.close ?? '?'}`)
            .join(', ')
        : 'flexible';

      // Find which trip days this place is CLOSED (has hours data but missing that dow)
      const closedDays = tripDays
        ?.filter((td) => {
          if (!p.openingHours?.length) return false;
          return !p.openingHours.some((h) => h.day === td.dayOfWeek);
        })
        .map((td) => `Day${td.dayNumber}(${td.dayName})`)
        ?? [];

      const closedNote = closedDays.length > 0 ? ` ⚠CLOSED: ${closedDays.join(',')}` : '';

      const religious = (p.tags ?? []).some((t) => String(t).toLowerCase() === 'religious');
      const costStr = religious ? 'FREE' : `${p.price} ${p.currency}${p.perPerson ? '/person' : ''}`;
      const score = (p as any).score ?? 50;

      return JSON.stringify({
        id: p.id,
        name: p.name,
        type: p.type,
        rating: p.rating,
        tags: p.tags,
        cost: costStr,
        perPerson: p.perPerson,
        price: p.price,
        currency: p.currency,
        hours: hoursStr,
        score,
        ...(closedNote ? { closedWarning: closedNote.trim() } : {}),
      });
    }).join('\n');
  }

  private buildDayScheduleSection(
    tripDays?: TripDayContext[],
    weatherForecast?: PerDayWeather[],
  ): string {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (!tripDays?.length) {
      return 'No specific day-of-week data available. Assume all places are open.';
    }

    const lines = tripDays.map((d) => {
      const weather = d.weather ?? weatherForecast?.[d.dayNumber - 1];
      const weatherNote = weather
        ? ` | Weather: ${weather.tempC}°C, ${weather.condition}${weather.isRainy ? ' [RAINY — prefer INDOOR]' : weather.isHot ? ' [HOT — afternoon INDOOR]' : ''}`
        : '';

      const closedNote = d.closedPlaceIds?.length
        ? ` | CLOSED on this day: ${d.closedPlaceIds.join(', ')}`
        : '';

      return `Day ${d.dayNumber}: ${d.dayName} (${d.date})${weatherNote}${closedNote}`;
    });

    return lines.join('\n') +
      '\n\nIMPORTANT: Each day above shows its actual calendar day. Cross-reference with each place\'s openingHours array (day 0=Sun,1=Mon,...6=Sat). A place with no entry for a given day number is CLOSED on that day — do NOT schedule it.';
  }

  private buildTravelerProfileSection(
    travelerType?: string,
    mobilityLevel?: string,
    ageGroups?: string[],
    persons?: number,
  ): string {
    const profileInstructions: Record<string, string> = {
      adventure: `ADVENTURE TRAVELER PROFILE:
- PRIORITIZE: outdoor activities, hiking trails, nature reserves, adventure sports, scenic viewpoints, beaches
- AVOID: shopping malls, luxury restaurants, passive experiences
- Schedule: Early morning outdoor start (sunrise hikes, markets), active afternoon, casual evening meal
- Energy: High-intensity itinerary — pack activities, minimize dead time
- Accommodation note: Efficiency > comfort`,

      luxury: `LUXURY TRAVELER PROFILE:
- PRIORITIZE: highest-rated restaurants (4.5+ stars), exclusive experiences, premium venues, iconic landmarks with private access
- AVOID: budget eateries, crowded tourist traps, generic experiences
- Schedule: Late morning start, premium dining for lunch AND dinner, 1-2 signature experiences per day
- Pacing: Comfortable, never rushed — quality over quantity
- Dining: Always include a notable restaurant for evening (highest-rated in list)
- Budget: Use the full budget; never settle for cheap alternatives when premium options exist`,

      backpacker: `BACKPACKER PROFILE:
- PRIORITIZE: free attractions (religious sites, parks, public spaces, markets), low-cost cafes, local street food spots
- AVOID: expensive attractions, hotels, premium restaurants
- Schedule: Pack maximum places into each day — efficiency is key
- Budget: AGGRESSIVELY minimize spending — target 50% under daily budget cap
- Diversity: Different neighborhood each day, local markets, public squares
- Tips: Include local transportation tips, free entry times, budget meal recommendations`,

      family: `FAMILY TRAVELER PROFILE:
- PRIORITIZE: kid-friendly venues, interactive museums, parks, safe public spaces, family restaurants
- AVOID: bars, nightlife venues, extreme activities, venues requiring long standing waits
- Schedule: Morning activity (educational/fun), lunch break with kid-friendly meal, afternoon 1 lighter activity, early dinner
- Pacing: RELAXED — include rest time between stops, never more than 2 heavy activities per day
- Duration limits: Keep each visit under 90 minutes for children's attention spans
- ${ageGroups?.includes('children') ? 'CHILDREN present: prioritize playgrounds, interactive exhibits, short walks' : ''}
- Tips: Mention stroller/accessibility, family meal deals, best times to avoid crowds with kids`,

      solo: `SOLO TRAVELER PROFILE:
- PRIORITIZE: social cafes and co-working spots, cultural venues (museums, galleries), local markets, scenic walks
- Variety: Mix of social venues and personal exploration time
- Schedule: Flexible — 1 anchor activity per half-day, free exploration between
- Evening: Include a social venue (popular cafe, local bar, restaurant with open seating)
- Safety: Stick to well-lit, populated areas for evening activities
- Tips: Include solo-friendly dining tips, best times for popular attractions`,

      couple: `COUPLE/ROMANTIC PROFILE:
- PRIORITIZE: scenic viewpoints (sunset spots), romantic restaurants, botanical gardens, waterfront areas, cultural experiences
- AVOID: crowded tourist traps, solo-activity venues, family-only places
- Schedule: Leisurely morning, romantic lunch, afternoon cultural experience, sunset viewing, romantic dinner
- Evening: Always end with a high-quality dining experience (romantic atmosphere)
- Tips: Include reservation recommendations for popular restaurants, best photo spots, walking routes`,

      student: `STUDENT TRAVELER PROFILE:
- PRIORITIZE: cultural sites (museums, historical landmarks, universities), budget cafes, local markets, vibrant public spaces
- Budget: Cost-conscious — maximize cultural value per ILS spent
- Schedule: Morning: iconic landmark; Afternoon: cultural/historical site; Evening: local cafe or market
- Social: Include areas with local student life if available
- Tips: Student discount reminders, free museum days, cheap local food recommendations`,

      business: `BUSINESS TRAVELER PROFILE:
- PRIORITIZE: top-rated restaurants (for client dinners), iconic city landmarks (for context), efficient central locations
- AVOID: time-consuming activities, remote locations, physical adventures
- Schedule: COMPACT — max 2 activities per day; premium dining for lunch or dinner
- Efficiency: All places should be centrally located, minimizing transit time
- Evening: Always a premium dining option (best-rated restaurant in list)
- Tips: Include transport tips (taxi vs walk), restaurant reservation advice, business-hour awareness`,
    };

    const type = travelerType?.toLowerCase() ?? 'solo';
    const profileText =
      profileInstructions[type] ??
      profileInstructions['solo'];

    const mobilityNote =
      mobilityLevel === 'limited'
        ? '\nMOBILITY: LIMITED — avoid stairs, long walks (>500m between stops), and physically demanding venues.'
        : mobilityLevel === 'moderate'
          ? '\nMOBILITY: MODERATE — prefer flat routes, limit continuous walking to under 2km.'
          : '';

    const groupNote =
      ageGroups?.length
        ? `\nGROUP COMPOSITION: ${ageGroups.join(', ')} — adjust activity intensity and venue suitability accordingly.`
        : '';

    return profileText + mobilityNote + groupNote;
  }

  private buildWeatherSection(forecast?: PerDayWeather[]): string {
    if (!forecast?.length) {
      return 'No weather forecast available. Plan for typical conditions.';
    }

    const lines = forecast.map((day, i) => {
      const dayLabel = `Day ${i + 1} (${day.date})`;
      let advice = '';
      if (day.isRainy) {
        advice = ' → RAINY: prioritize indoor venues (museums, cafes, galleries) for this day.';
      } else if (day.isHot) {
        advice = ' → HOT: outdoor morning/evening only; move indoor for afternoon.';
      } else if (day.isCold) {
        advice = ' → COLD: wrap up outdoor visits; include warming indoor stops.';
      } else {
        advice = ' → Pleasant conditions: maximize outdoor and scenic experiences.';
      }
      return `${dayLabel}: ${day.tempC}°C, ${day.condition}${advice}`;
    });

    return lines.join('\n');
  }

  private buildBudgetGuidanceSection(
    budget: number,
    persons: number,
    days: number,
    travelerType?: string,
    currencyCode?: string,
  ): string {
    const currency = currencyCode ?? 'ILS';
    const perPersonTotal = Math.round(budget / Math.max(1, persons));
    const perDay = Math.round(budget / Math.max(1, days));
    const perPersonPerDay = Math.round(budget / Math.max(1, persons) / Math.max(1, days));

    const profileAllocations: Record<string, { food: number; attractions: number; transport: number; shopping: number; emergency: number }> = {
      adventure: { food: 20, attractions: 40, transport: 20, shopping: 5, emergency: 15 },
      luxury: { food: 45, attractions: 30, transport: 10, shopping: 5, emergency: 10 },
      backpacker: { food: 25, attractions: 20, transport: 30, shopping: 10, emergency: 15 },
      family: { food: 35, attractions: 35, transport: 15, shopping: 5, emergency: 10 },
      solo: { food: 30, attractions: 35, transport: 15, shopping: 10, emergency: 10 },
      couple: { food: 40, attractions: 30, transport: 10, shopping: 10, emergency: 10 },
      student: { food: 30, attractions: 30, transport: 20, shopping: 5, emergency: 15 },
      business: { food: 50, attractions: 20, transport: 15, shopping: 5, emergency: 10 },
    };

    const alloc = profileAllocations[travelerType ?? 'solo'] ?? profileAllocations['solo'];
    const foodBudget = Math.round(budget * alloc.food / 100);
    const attractionsBudget = Math.round(budget * alloc.attractions / 100);
    const transportBudget = Math.round(budget * alloc.transport / 100);
    const emergencyBudget = Math.round(budget * alloc.emergency / 100);

    return `Total Budget: ${budget} ${currency} for ${persons} person(s) over ${days} day(s)
Per person total: ${perPersonTotal} ${currency}
Daily group budget: ${perDay} ${currency}
Daily per-person budget: ${perPersonPerDay} ${currency}

Suggested budget allocation (${travelerType ?? 'balanced'} profile):
- Food & Dining: ~${foodBudget} ${currency} (${alloc.food}%)
- Attractions & Activities: ~${attractionsBudget} ${currency} (${alloc.attractions}%)
- Local Transport: ~${transportBudget} ${currency} (${alloc.transport}%)
- Emergency Reserve: ~${emergencyBudget} ${currency} (${alloc.emergency}%)

BUDGET RULE: The sum of all estimatedCosts in the plan MUST stay within ${budget} ${currency}.`;
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
    if (provider === 'gemini') return 'Gemini';
    if (provider === 'groq') return 'Groq';
    if (provider === 'openrouter') return 'OpenRouter';
    return 'HuggingFace';
  }

  private providerSuffix(provider: AiProviderName): string {
    if (provider === 'gemini') {
      return ` (${this.geminiModelName})`;
    }
    if (provider === 'groq') {
      return ` (${this.groqModel})`;
    }
    if (provider === 'openrouter') {
      return ` (${this.openRouterModels[0] ?? 'openrouter'})`;
    }
    return ` (${this.huggingFaceModel})`;
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

    if (status === 401 || status === 403) {
      this.registerGeminiCooldown(error);
      return new AiProviderUnavailableError(
        `Gemini credentials unavailable (${status}): ${this.describeError(this.getErrorResponseData(error) ?? error)}`,
        'gemini',
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
        this.extractRetryAfterMs(error) ??
        this.getOpenRouterCooldownRemainingMs();
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

  private normalizeGroqFailure(error: unknown): Error {
    if (error instanceof AiServiceError) {
      return error;
    }

    const status = this.getErrorStatus(error);
    const responseData = this.getErrorResponseData(error);
    const detail = responseData
      ? this.describeError(responseData)
      : this.describeError(error);
    const statusSuffix = status ? ` (${status})` : '';
    const modelSuffix = ` [model=${this.groqModel}]`;

    if (status === 429) {
      const retryAfterMs =
        this.extractRetryAfterMs(error) ?? this.getGroqCooldownRemainingMs();
      return new AiQuotaExceededError(
        `Groq request rate-limited${modelSuffix}: ${detail}`,
        'groq',
        Math.max(1, Math.ceil(Math.max(1, retryAfterMs) / 1000)),
        error,
      );
    }

    if (status === 503) {
      return new AiProviderUnavailableError(
        `Groq temporarily unavailable${statusSuffix}${modelSuffix}: ${detail}`,
        'groq',
        error,
      );
    }

    return new AiProviderRequestError(
      `Groq request failed${statusSuffix}${modelSuffix}: ${detail}`,
      'groq',
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

  private isGroqCoolingDown(): boolean {
    return this.groqCooldownUntil > Date.now();
  }

  private getGroqCooldownRemainingMs(): number {
    return Math.max(0, this.groqCooldownUntil - Date.now());
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

  private registerGroqCooldown(error: unknown): void {
    const retryAfterMs = this.extractRetryAfterMs(error);
    const cooldownMs = Math.max(this.groqCooldownMs, retryAfterMs ?? 0);
    this.groqCooldownUntil = Math.max(
      this.groqCooldownUntil,
      Date.now() + cooldownMs,
    );

    this.logger.warn(
      `Groq quota exceeded; pausing Groq requests for ${Math.ceil(cooldownMs / 1000)}s`,
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

  private isRetryableGroqError(error: unknown): boolean {
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
